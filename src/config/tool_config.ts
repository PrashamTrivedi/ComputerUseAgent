import {ToolConfig} from "../types/interfaces.ts"

export class ToolConfigManager {
    validateToolConfig(config: ToolConfig[]): boolean {
        return config.every(tool => {
            return tool.toolName &&
                   tool.command &&
                   Array.isArray(tool.inputs) &&
                   tool.inputs.every(input => input.name && input.type);
        });
    }

    loadConfig(configPath: string): ToolConfig[] {
        try {
            const configText = Deno.readTextFileSync(configPath);
            const config = JSON.parse(configText);
            const tools = Array.isArray(config) ? config : config.tools || [];
            
            if (!this.validateToolConfig(tools)) {
                throw new Error("Invalid tool configuration format");
            }
            return tools;
        } catch (error) {
            console.warn(`Could not load config from ${configPath}: ${error}`);
            return [];
        }
    }
}
