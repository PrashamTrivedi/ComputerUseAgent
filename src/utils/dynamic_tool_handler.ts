import {ToolConfig} from "../types/interfaces.ts"
import {BashHandlers} from "../modules/bash/handlers.ts"
import Anthropic from "anthropic"

export class DynamicToolHandler {
    private bashHandlers: BashHandlers

    constructor(private tools: ToolConfig[], noAgi = false) {
        this.bashHandlers = new BashHandlers(noAgi)
    }

    getTools(): Anthropic.Beta.Messages.BetaTool[] {
        return this.tools
            .filter(tool => tool.enabled)
            .map(tool => this.createToolDefinition(tool))
    }

    createToolDefinition(tool: ToolConfig): Anthropic.Beta.BetaTool {
        return {
            type: "custom",
            name: tool.toolName,
            description: tool.description,
            input_schema: {
                type: "object",
                properties: {
                    input: {type: "string"}
                },
                required: ["input"]
            }
        }
    }

    async handleDynamicTool(toolCall: any): Promise<Record<string, any>> {
        const tool = this.tools.find(t => t.toolName === toolCall.function.name)
        if (!tool) throw new Error(`Tool ${toolCall.function.name} not found`)

        const command = tool.command.replace("{{input}}", toolCall.function.arguments.input)
        const result = await this.bashHandlers.handleBashCommand({command})

        return {output: result}
    }
}
