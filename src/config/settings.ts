import {join} from "jsr:@std/path"
import {homedir} from "node:os"
import {UserSettings} from "../types/interfaces.ts"

const MODEL_MAP = {
  "3.5-sonnet": "claude-3-5-sonnet-20241022",
  "3.7-sonnet": "claude-3-7-sonnet-20250219", 
  "4-sonnet": "claude-sonnet-4-20250514",
  "4-opus": "claude-opus-4-20250514"
} as const

const DEFAULT_SETTINGS: UserSettings = {
    userName: "User",
    jinaApiKey: undefined,
    toolConfigPath: join(homedir(), ".ComputerUseAgent", "tools.json"),
    editorCommand: "nano",
    model: "3.5-sonnet"
}

const SETTINGS_PATH = join(homedir(), ".ComputerUseAgent", "settings.json")

export function loadUserSettings(): UserSettings {
    try {
        const content = Deno.readTextFileSync(SETTINGS_PATH)
        return {...DEFAULT_SETTINGS, ...JSON.parse(content)}
    } catch {
        return DEFAULT_SETTINGS
    }
}

export function saveUserSettings(settings: UserSettings) {
    Deno.writeTextFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

export function isJinaAvailable(): boolean {
    const settings = loadUserSettings()
    return Boolean(settings.jinaApiKey)
}

export function getJinaApiKey(): string {
    const settings = loadUserSettings()
    return settings.jinaApiKey || ""
}

export function getConfigFileLocation(): string {
    const settings = loadUserSettings()
    return settings.toolConfigPath
}

export function getSelectedModel(): string {
    const settings = loadUserSettings()
    const modelKey = settings.model || "3.5-sonnet"
    return MODEL_MAP[modelKey as keyof typeof MODEL_MAP] || MODEL_MAP["3.5-sonnet"]
}

export function validateModel(model: string): boolean {
    return model in MODEL_MAP
}

export function getAvailableModels(): string[] {
    return Object.keys(MODEL_MAP)
}

export function getModelMap(): typeof MODEL_MAP {
    return MODEL_MAP
}
