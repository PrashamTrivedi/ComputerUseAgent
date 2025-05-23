import {parseArgs} from "jsr:@std/cli/parse-args"
import {loadUserSettings, saveUserSettings, validateModel, getAvailableModels} from "../config/settings.ts"
import {parseFlagForHelp} from "../utils/functions.ts"

export async function handleSettings(args: string[]): Promise<void> {
    const settingsFlags = {
        string: ["set-name", "set-jina-key", "set-config", "set-editor", "set-model"],
        boolean: ["list", "list-models"],
    }
    const flags = parseArgs(args, settingsFlags)

    if (flags._[1] === "help") {
        console.log(parseFlagForHelp(settingsFlags))
        return
    }
    const settings = await loadUserSettings()

    if (flags["set-config"]) {
        settings.toolConfigPath = flags["set-config"]
        console.log(`Tool configuration path set to: ${flags["set-config"]}`)
    }
    else if (flags["set-name"]) {
        settings.userName = flags["set-name"]
    }
    else if (flags["set-jina-key"]) {
        settings.jinaApiKey = flags["set-jina-key"]
        console.log("Jina API key has been set")
    }
    else if (flags["list-models"]) {
        const models = getAvailableModels()
        console.log("Available models:")
        models.forEach(model => {
            const current = settings.model === model ? " (current)" : ""
            console.log(`  ${model}${current}`)
        })
        return
    }
    else if (flags["set-model"]) {
        const model = flags["set-model"]
        if (!validateModel(model)) {
            console.error(`Invalid model: ${model}`)
            console.log("Available models:", getAvailableModels().join(", "))
            return
        }
        settings.model = model
        console.log(`Model set to: ${model}`)
        
        // Warn about cost implications for expensive models
        if (model === "4-opus") {
            console.log("⚠️  Warning: 4 Opus is significantly more expensive than other models")
        }
    }
    else if (flags.list) {
        console.log(JSON.stringify(settings, null, 2))
        return
    }
    else if (flags["set-editor"]) {
        settings.editorCommand = flags["set-editor"]
        console.log(`Editor command set to: ${flags["set-editor"]}`)
    }

    await saveUserSettings(settings)
}
