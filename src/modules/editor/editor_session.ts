import {BaseSession} from "../../utils/session.ts"
import {EDITOR_SYSTEM_PROMPT, API_CONFIG, MEMORY_TOOLS} from "../../config/constants.ts"
import {ToolResult} from "../../types/interfaces.ts"
import {log} from "../../config/logging.ts"
import {EditorHandlers} from "./handlers.ts"
import {MemoryManager} from "../memory/memory_manager.ts"

export class EditorSession extends BaseSession {
    private handlers: EditorHandlers
    private memoryManager: MemoryManager

    constructor(sessionId?: string) {
        super(sessionId)
        this.handlers = new EditorHandlers()
        this.memoryManager = new MemoryManager()
    }

    async processEdit(prompt: string): Promise<void> {
        try {
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
                        {type: "text_editor_20241022", name: "str_replace_editor"},
                        ...MEMORY_TOOLS
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
                    console.log(response.content.find((block) => block.type === "text")?.text ?? "editor")
                    break
                }

                const toolResults = await this.processToolCalls(response.content)

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
        } catch (error) {
            log.error(`Error in processEdit: ${error instanceof Error ? error.message : String(error)}`)
            if (error instanceof Error && error.stack) {
                log.error(error.stack)
            }
            throw error
        }
    }

    private async processToolCalls(content: any[]): Promise<ToolResult[]> {
        const results: ToolResult[] = []

        for (const toolCall of content) {
            if (toolCall.type === "tool_use") {
                let result
                let isError = false

                switch (toolCall.name) {
                    case "str_replace_editor":
                        result = await this.handlers.handleTextEditorTool(toolCall.input)
                        isError = "error" in result
                        break
                    case "add_memory":
                        result = await this.memoryManager.addMemory(toolCall.input.content)
                        break
                    case "get_memories":
                        result = await this.memoryManager.getMemories()
                        break
                    case "clear_memories":
                        await this.memoryManager.clearMemories()
                        result = {message: "Memories cleared successfully"}
                        break
                }

                results.push({
                    tool_call_id: toolCall.id,
                    output: {
                        type: "tool_result",
                        content: [{
                            type: "text",
                            text: JSON.stringify(result)
                        }],
                        tool_use_id: toolCall.id,
                        is_error: isError,
                    },
                })
            }
        }

        return results
    }
}
