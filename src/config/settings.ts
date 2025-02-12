import {join} from "jsr:@std/path"
import {homedir} from "node:os"
import {UserSettings} from "../types/interfaces.ts"

const DEFAULT_SETTINGS: UserSettings = {
    userName: "User",
    jinaApiKey: undefined,
    toolConfigPath: join(homedir(), ".ComputerUseAgent", "tools.json"),
    editorCommand: "nano"
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
