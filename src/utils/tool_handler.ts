import {BashHandlers} from "../modules/bash/handlers.ts"
import {EditorHandlers} from "../modules/editor/handlers.ts"
import {MemoryManager} from "../modules/memory/memory_manager.ts"
import {ToolResult, ToolConfig, ToolCall} from "../types/interfaces.ts"
import {ClipboardManager} from "../modules/clipboard/clipboard.ts"
import {readPage, search, searchGrounding} from "./jina.ts"
import {DynamicToolHandler} from "./dynamic_tool_handler.ts"
import {MEMORY_TOOLS, CLIPBOARD_TOOLS, JINA_TOOLS} from "../config/constants.ts"
import {isJinaAvailable} from "../config/settings.ts"
import Anthropic from "anthropic"
import {ToolConfigManager} from "../config/tool_config.ts"


export class ToolHandler {
    private bashHandlers: BashHandlers
    private editorHandlers: EditorHandlers
    private memoryManager: MemoryManager
    private clipboardManager: ClipboardManager
    private dynamicHandler?: DynamicToolHandler

    constructor(noAgi = false, toolConfig?: ToolConfig[]) {
        this.bashHandlers = new BashHandlers(noAgi)
        this.editorHandlers = new EditorHandlers()
        this.memoryManager = new MemoryManager()
        this.clipboardManager = new ClipboardManager()

        // Validate tool config before initialization
        if (toolConfig) {
            const configManager = new ToolConfigManager()
            if (configManager.validateToolConfig(toolConfig)) {
                this.dynamicHandler = new DynamicToolHandler(toolConfig, noAgi)
            } else {
                console.warn("Invalid tool configuration provided")
            }
        }
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
        const availableTools = this.dynamicHandler?.getTools() ?? []
        const matchedTool = availableTools.find(t => t.name === toolCall.name)
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
            case "readPage":
                return await readPage(toolCall.input.url)
            case "search":
                return await search(toolCall.input.searchTerm)
            case "searchGrounding":
                return await searchGrounding(toolCall.input.searchTerm)
            default:
                if (matchedTool) {
                    return await this.dynamicHandler?.handleDynamicTool(toolCall)
                }
                throw new Error(`Unknown tool: ${toolCall.name}`)
        }
    }

    getAllTools(): Anthropic.Beta.BetaTool[] {
        const baseTools = [
            ...MEMORY_TOOLS,
            ...CLIPBOARD_TOOLS,
            ...(isJinaAvailable() ? JINA_TOOLS : []),
            ...(this.dynamicHandler ? this.dynamicHandler.getTools() : [])
        ]

        return baseTools
    }

    getDynamicTools(): Anthropic.Beta.BetaTool[] {
        const dynamicTools = this.dynamicHandler ? this.dynamicHandler.getTools() : []
        if (isJinaAvailable()) {
            return [...dynamicTools, ...JINA_TOOLS]
        }
        return dynamicTools
    }
}
