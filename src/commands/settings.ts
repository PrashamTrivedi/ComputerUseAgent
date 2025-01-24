import {parseArgs} from "jsr:@std/cli/parse-args"
import {loadUserSettings, saveUserSettings} from "../config/settings.ts"
import {parseFlagForHelp, getCommandHelp} from "../utils/functions.ts"

export async function handleSettings(args: string[]): Promise<void> {
    const settingsFlags = {
        string: ["set-name", "add-command", "remove-command", "set-jina-key"],
        boolean: ["list"],
    }
    const flags = parseArgs(args, settingsFlags)

    if (flags._[1] === "help") {
        console.log(parseFlagForHelp(settingsFlags))
        return
    }
    const settings = await loadUserSettings()

    if (flags["set-name"]) {
        settings.userName = flags["set-name"]
    }
    else if (flags["set-jina-key"]) {
        settings.jinaApiKey = flags["set-jina-key"]
        console.log("Jina API key has been set")
    }
    else if (flags["add-command"]) {
        const commandNameFromArg = flags["add-command"] as string
        let commandName = commandNameFromArg
        let commandDescription = ""
        if (commandNameFromArg.includes(",")) {
            const commandSplit = commandNameFromArg.split(",")
            commandName = commandSplit[0]
            commandDescription = commandSplit[1]
        }
        const helpInfo = await getCommandHelp(commandName)
        console.log(`Got help info for ${commandName}}`)

        const existingCommandIndex = settings.customCommands.findIndex(cmd => cmd.name === commandName)
        if (existingCommandIndex >= 0) {
            settings.customCommands[existingCommandIndex] = {
                name: commandName,
                description: commandDescription || helpInfo.description,
                helpText: helpInfo.helpText,
            }
        } else {
            settings.customCommands.push({
                name: commandName,
                description: commandDescription || helpInfo.description,
                helpText: helpInfo.helpText,
            })
        }
        console.log(`Added command ${commandName} with help information`)
    }
    else if (flags["remove-command"]) {
        const commandNameFromArg = flags["remove-command"] as string
        const index = settings.customCommands.findIndex(cmd => cmd.name === commandNameFromArg)
        console.log(`Removing command ${flags["remove-command"]} at index ${index}`)
        if (index >= 0) settings.customCommands.splice(index, 1)
    }
    else if (flags.list) {
        console.log(JSON.stringify(settings, null, 2))
        return
    }

    await saveUserSettings(settings)
}
