import {BaseSession} from "../../utils/session.ts"
import {BASH_SYSTEM_PROMPT, API_CONFIG, MEMORY_TOOLS} from "../../config/constants.ts"
import {log} from "../../config/logging.ts"
import {ToolHandler} from "../../utils/tool_handler.ts"
import Anthropic from "anthropic";

export class BashSession extends BaseSession {
    private toolHandler: ToolHandler

    constructor(sessionId?: string, noAgi = false) {
        super(sessionId)
        this.toolHandler = new ToolHandler(noAgi)
    }

    async processBashCommand(bashPrompt: string): Promise<void> {
        try {
            const systemInfo = {
                os: Deno.build.os,
                arch: Deno.build.arch,
                isWsl: Deno.env.get("WSL_DISTRO_NAME") !== undefined,
                shell: Deno.env.get("SHELL") || "Unknown",
            }

            const systemContext = `${BASH_SYSTEM_PROMPT}
<SystemInfo>
System Context:
- Operating System: ${systemInfo.os}
- Architecture: ${systemInfo.arch}
- Shell: ${systemInfo.shell}
- WSL: ${systemInfo.isWsl ? "Yes" : "No"}
- Current Directory: ${Deno.cwd()}
</SystemInfo>`

            const apiMessage = {
                role: "user",
                content: [{type: "text", text: bashPrompt}],
            }
            this.messages = [apiMessage]

            log.info(`User input: ${JSON.stringify(apiMessage)}`)

            let result = ""
            while (true) {
                const response = await this.client.beta.messages.create({
                    model: API_CONFIG.MODEL,
                    max_tokens: API_CONFIG.MAX_TOKENS,
                    messages: this.messages,
                    tools: [{type: "bash_20241022", name: "bash"}
                        , ...MEMORY_TOOLS
                    ],
                    system: this.getSystemPrompt(),
                    betas: ["computer-use-2024-10-22"],
                })

                const inputTokens = response.usage?.input_tokens ?? 0
                const outputTokens = response.usage?.output_tokens ?? 0
                this.logger.updateTokenUsage(inputTokens, outputTokens)

                const responseContent = response.content.map((block) =>
                    block.type === "text" ? {type: "text", text: block.text} : block
                )

                this.messages.push({role: "assistant", content: responseContent})

                if (response.content.find((block) => block.type === "text")?.text) {
                    const text = response.content.find((block) => block.type === "text")?.text || ""
                    result += text + "\n"
                }

                if (response.stop_reason !== "tool_use") {
                    console.log(response.content.find((block) => block.type === "text")?.text ?? "bash")
                    break
                }

                const toolResults = await this.toolHandler.processToolCalls(response.content)

                if (toolResults.length) {
                    this.messages.push({
                        role: "user",
                        content: [toolResults[0].output],
                    })

                    if (toolResults[0].output.is_error) {
                        log.error(`Error: ${toolResults[0].output.content[0].text}`)
                        break
                    }
                }
            }

            this.logger.logTotalCost()
            await this.logInteraction('bash', bashPrompt, result, this.sessionId)
        } catch (error) {
            log.error(`Error in processBashCommand: ${error}`)
            await this.logInteraction('bash', bashPrompt, `${error}`, this.sessionId)
            throw error
        }
    }
}
