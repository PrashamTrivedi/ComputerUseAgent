import {BaseSession} from "../../utils/session.ts"
import {COMBINED_SYSTEM_PROMPT, API_CONFIG, MEMORY_TOOLS, CLIPBOARD_TOOLS, JINA_TOOLS} from "../../config/constants.ts"
import {log} from "../../config/logging.ts"
import {ToolHandler} from "../../utils/tool_handler.ts"



export class HybridSession extends BaseSession {
    private toolHandler: ToolHandler

    constructor(sessionId: string, noAgi = false) {
        super(sessionId)
        this.toolHandler = new ToolHandler(noAgi)
    }

    async process(prompt: string): Promise<void> {
        try {
            const systemInfo = {
                os: Deno.build.os,
                arch: Deno.build.arch,
                isWsl: Deno.env.get("WSL_DISTRO_NAME") !== undefined,
                shell: Deno.env.get("SHELL") || "Unknown",
                cwd: Deno.cwd(),
            }

            const message = {
                role: "user",
                content: [{type: "text", text: prompt}],
            }
            this.messages = [message]

            log.info(`User input: ${JSON.stringify(message)}`)

            while (true) {
                const response = await this.client.beta.messages.create({
                    model: API_CONFIG.MODEL,
                    max_tokens: API_CONFIG.MAX_TOKENS,
                    messages: this.messages,
                    tools: [
                        {type: "bash_20241022", name: "bash"},
                        {type: "text_editor_20241022", name: "str_replace_editor"},
                        ...MEMORY_TOOLS,
                        ...CLIPBOARD_TOOLS,
                        ...JINA_TOOLS
                    ],
                    system: this.getSystemPrompt(`${COMBINED_SYSTEM_PROMPT}\nSystem Context: ${JSON.stringify(systemInfo)}`),
                    betas: ["computer-use-2024-10-22"],
                })

                const inputTokens = response.usage?.input_tokens ?? 0
                const outputTokens = response.usage?.output_tokens ?? 0
                this.logger.updateTokenUsage(inputTokens, outputTokens)

                const responseContent = response.content.map((block) =>
                    block.type === "text" ? {type: "text", text: block.text} : block
                )

                this.messages.push({role: "assistant", content: responseContent})

                if (response.stop_reason !== "tool_use") {
                    console.log(response.content.find((block) => block.type === "text")?.text ?? "")
                    break
                }

                const toolResults = await this.toolHandler.processToolCalls(response.content)

                if (toolResults?.length) {
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
            await this.logInteraction('hybrid', prompt, "passed")
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
