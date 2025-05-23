import {BaseSession} from "../../utils/session.ts"
import {getAPIConfig} from "../../config/constants.ts"
import {log} from "../../config/logging.ts"
import {ToolHandler} from "../../utils/tool_handler.ts"
import {getConfigFileLocation} from "../../config/settings.ts"
import {ToolConfigManager} from "../../config/tool_config.ts"
import generatePlan from "../planner/planner.ts"
import Anthropic from "anthropic"

export class HybridSession extends BaseSession {
    private toolHandler: ToolHandler
    private cachedSystemPrompt: string = ""
    private systemInfo: string

    constructor(sessionId: string, noAgi = false) {
        super(sessionId)
        const configPath = getConfigFileLocation()
        const toolConfig = new ToolConfigManager().loadConfig(configPath)
        this.toolHandler = new ToolHandler(noAgi, toolConfig)

        // Initialize system info
        this.systemInfo = JSON.stringify({
            os: Deno.build.os,
            arch: Deno.build.arch,
            isWsl: Deno.env.get("WSL_DISTRO_NAME") !== undefined,
            shell: Deno.env.get("SHELL") || "Unknown",
        })
    }

    async process(prompt: string): Promise<void> {
        try {
            // Cache the system prompt with system info
            this.cachedSystemPrompt = this.getSystemPrompt(
                this.toolHandler.getDynamicTools(),
                this.systemInfo
            )

            // Generate execution plan
            const plan = await generatePlan(this.systemInfo, this.toolHandler.getAllTools(), prompt, this.sessionId)
            log.info(`Plan: ${JSON.stringify(plan)}`)

            // Execute each step in the plan
            for (const step of plan.planSteps) {
                console.log(`🤖 Executing step ${step.step}: ${step.action}`)

                const message = {
                    role: "user",
                    content: [{type: "text", text: step.action}],
                }
                this.messages.push(message)
                const tools = this.toolHandler.getAllTools()
                let stepResult = ""
                let stepError = ''

                try {
                    while (true) {
                        const apiConfig = getAPIConfig()
                        const response = await this.client.beta.messages.create({
                            model: apiConfig.MODEL,
                            max_tokens: apiConfig.MAX_TOKENS,
                            messages: this.messages,
                            tools: [
                                {type: "bash_20241022", name: "bash"},
                                {type: "text_editor_20241022", name: "str_replace_editor"},
                                ...tools
                            ],
                            system: this.cachedSystemPrompt,
                            betas: ["computer-use-2024-10-22"],
                        })

                        const inputTokens = response.usage?.input_tokens ?? 0
                        const outputTokens = response.usage?.output_tokens ?? 0
                        this.logger.updateTokenUsage(inputTokens, outputTokens, apiConfig.MODEL)

                        const responseContent = response.content.map((block) =>
                            block.type === "text" ? {type: "text", text: block.text} : block
                        )

                        if (response.content.find((block) => block.type === "text")?.text) {
                            const text = response.content.find((block) => block.type === "text")?.text || ""
                            console.log(`🤖 ${text}`)
                            stepResult += text + "\n"
                        }

                        this.messages.push({role: "assistant", content: responseContent})

                        if (response.stop_reason !== "tool_use") {
                            break
                        }

                        const toolResults = await this.toolHandler.processToolCalls(response.content as Anthropic.Beta.BetaToolUseBlock[])
                        if (toolResults?.length) {
                            this.messages.push({
                                role: "user",
                                content: [toolResults[0].output],
                            })
                            if (toolResults[0].output.is_error) {
                                const error = toolResults[0].output.content[0].text
                                log.error(`Error: ${error}`)
                                stepError = error
                                break
                            }
                            stepResult += toolResults[0].output.content[0].text + "\n"
                        }
                    }
                } catch (error) {
                    stepError = error instanceof Error ? error.message : String(error)
                    log.error(`Error in step ${step.step}: ${stepError}`)
                }

                // Log the step execution
                await this.db.logSessionStep({
                    session_id: this.sessionId,
                    step_number: step.step,
                    step_description: step.action,
                    tools_used: tools.map((tool) => tool.name),
                    result: stepResult,
                    error: stepError
                })
            }

            this.logger.logTotalCost()
            await this.logInteraction('hybrid', `${this.cachedSystemPrompt}\n${prompt}`, "completed")
        } catch (error) {
            log.error(`Error in hybrid process: ${error instanceof Error ? error.message : String(error)}`)
            if (error instanceof Error && error.stack) {
                log.error(error.stack)
            }
            await this.logInteraction('hybrid', prompt, `${error}`)
            throw error
        }
    }
}
