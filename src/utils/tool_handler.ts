import {BashHandlers} from "../modules/bash/handlers.ts"
import {EditorHandlers} from "../modules/editor/handlers.ts"
import {MemoryManager} from "../modules/memory/memory_manager.ts"
import {ToolResult} from "../types/interfaces.ts"
import {log} from "../config/logging.ts"
import {ClipboardManager} from "../modules/clipboard/clipboard.ts"

export class ToolHandler {
    private bashHandlers: BashHandlers
    private editorHandlers: EditorHandlers
    private memoryManager: MemoryManager
    private clipboardManager: ClipboardManager

    constructor(noAgi = false) {
        this.bashHandlers = new BashHandlers(noAgi)
        this.editorHandlers = new EditorHandlers()
        this.memoryManager = new MemoryManager()
        this.clipboardManager = new ClipboardManager()
    }

    async processToolCalls(content: any[]): Promise<ToolResult[]> {
        const results: ToolResult[] = []

        for (const toolCall of content) {
            if (toolCall.type === "tool_use") {
                let result
                let isError = false

                try {
                    result = await this.handleTool(toolCall)
                    isError = typeof result === 'object' && result !== null && 'error' in result
                } catch (error) {
                    result = {error: String(error)}
                    isError = true
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

    private async handleTool(toolCall: any) {
        switch (toolCall.name) {
            case "bash":
                return await this.bashHandlers.handleBashCommand(toolCall.input)
            case "str_replace_editor":
                return await this.editorHandlers.handleTextEditorTool(toolCall.input)
            case "add_memory":
                return await this.memoryManager.addMemory(toolCall.input.content)
            case "get_memories":
                return await this.memoryManager.getMemories()
            case "clear_memories":
                await this.memoryManager.clearMemories()
                return {message: "Memories cleared successfully"}
            case "read_clipboard":
                return await this.clipboardManager.readClipboard()
            default:
                throw new Error(`Unknown tool: ${toolCall.name}`)
        }
    }
}
