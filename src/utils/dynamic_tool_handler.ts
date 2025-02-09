import {ToolConfig} from "../types/interfaces.ts"
import {BashHandlers} from "../modules/bash/handlers.ts"
import Anthropic from "anthropic"
import {log} from "../config/logging.ts"

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
        const properties: Record<string, any> = {}
        const required: string[] = []

        tool.inputs.forEach(input => {
            properties[input.name] = {
                type: input.type,
                description: input.description
            }
            if (input.required !== false) {
                required.push(input.name)
            }
        })

        return {
            type: "custom",
            name: tool.toolName,
            description: tool.description,
            input_schema: {
                type: "object",
                properties,
                required
            }
        }
    }

    async handleDynamicTool(toolCall: any): Promise<Record<string, any>> {
        // log.info(`Handling dynamic tool: ${JSON.stringify(toolCall)}`)
        log.info(`Handling dynamic tool: ${toolCall.name}`)
        const tool = this.tools.find(t => t.toolName === toolCall.name)
        if (!tool) throw new Error(`Tool ${toolCall.name} not found`)

        let command = tool.command
        tool.inputs.forEach(input => {
            const value = toolCall.input[input.name]
            log.debug(`Replacing {{${input.name}}} with ${value}`)
            command = command.replace(`{{${input.name}}}`, value)
        })
        // log.debug(`Command: ${command}`)

        const result = await this.bashHandlers.handleBashCommand({command})
        return {output: result}
    }
}
