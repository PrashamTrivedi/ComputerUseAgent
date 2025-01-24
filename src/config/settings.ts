import {join} from "jsr:@std/path"
import {homedir} from "node:os"
import {UserSettings} from "../types/interfaces.ts"

const DEFAULT_SETTINGS: UserSettings = {
    userName: "User",
    customCommands: []
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
