import { join } from "jsr:@std/path";
import { homedir } from "node:os";
import { UserSettings } from "../types/interfaces.ts";

const DEFAULT_SETTINGS: UserSettings = {
    userName: "User",
    customCommands: []
};

const SETTINGS_PATH = join(homedir(), ".ComputerUseAgent", "settings.json");

export async function loadUserSettings(): Promise<UserSettings> {
    try {
        const content = await Deno.readTextFile(SETTINGS_PATH);
        return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
    await Deno.writeTextFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}
