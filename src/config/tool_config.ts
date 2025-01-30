import {ToolConfig} from "../types/interfaces.ts"

export class ToolConfigManager {
    loadConfig(configPath: string): ToolConfig[] {
        try {
            const configText = Deno.readTextFileSync(configPath)
            const config = JSON.parse(configText)
            return Array.isArray(config) ? config : config.tools || []
        } catch (error) {
            console.warn(`Could not load config from ${configPath}: ${error}`)
            return []
        }
    }
}
