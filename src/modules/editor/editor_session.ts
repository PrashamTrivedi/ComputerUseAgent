import {BaseSession} from "../../utils/session.ts"
import {EDITOR_SYSTEM_PROMPT, API_CONFIG, MEMORY_TOOLS} from "../../config/constants.ts"
import {log} from "../../config/logging.ts"
import {ToolHandler} from "../../utils/tool_handler.ts"

export class EditorSession extends BaseSession {
    private toolHandler: ToolHandler

    constructor(sessionId?: string) {
        super(sessionId)
        this.toolHandler = new ToolHandler()
    }

    async processEdit(prompt: string): Promise<void> {
        try {
            const message = {
                role: "user",
                content: [{type: "text", text: prompt}],
            }
            this.messages = [message]

            log.info(`User input: ${JSON.stringify(message)}`)
            let result = ""

            while (true) {
                const response = await this.client.beta.messages.create({
                    model: API_CONFIG.MODEL,
                    max_tokens: API_CONFIG.MAX_TOKENS,
                    messages: this.messages,
                    tools: [
                        {type: "text_editor_20241022", name: "str_replace_editor"},
                        ...MEMORY_TOOLS,
                    ],
                    system: EDITOR_SYSTEM_PROMPT,
                    betas: ["computer-use-2024-10-22"],
                })

                const inputTokens = response.usage?.input_tokens ?? 0
                const outputTokens = response.usage?.output_tokens ?? 0
                log.info(`API usage: input_tokens=${inputTokens}, output_tokens=${outputTokens}`)
                this.logger.updateTokenUsage(inputTokens, outputTokens)

                const responseContent = response.content.map((block) =>
                    block.type === "text" ? {type: "text", text: block.text} : block
                )

                this.messages.push({role: "assistant", content: responseContent})

                if (response.stop_reason !== "tool_use") {
                    if (response.content.find((block) => block.type === "text")?.text) {
                        const text = response.content.find((block) => block.type === "text")?.text || ""
                        result += text + "\n"
                    }
                    console.log(response.content.find((block) => block.type === "text")?.text ?? "editor")
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
            await this.logInteraction('editor', prompt, result, this.sessionId)
        } catch (error) {
            log.error(`Error in processEdit: ${error instanceof Error ? error.message : String(error)}`)
            if (error instanceof Error && error.stack) {
                log.error(error.stack)
            }
            await this.logInteraction('editor', prompt, `${error}`, this.sessionId)
            throw error
        }
    }
}
