import {parseArgs} from "jsr:@std/cli/parse-args"
import {loadUserSettings, saveUserSettings} from "../config/settings.ts"
import {parseFlagForHelp} from "../utils/functions.ts"

export async function handleSettings(args: string[]): Promise<void> {
    const settingsFlags = {
        string: ["set-name", "add-command", "remove-command"],
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
    else if (flags["add-command"]) {
        const addCommandValue = flags["add-command"] as string;
        const [name, description, helpCmd, ...helpFlags] = addCommandValue.split(",")
        settings.customCommands.push({
            name,
            description,
            helpCommand: helpCmd,
            helpFlags: helpFlags
        })
    }
    else if (flags["remove-command"]) {
        const index = settings.customCommands.findIndex(cmd => cmd.name === flags["remove-command"])
        if (index >= 0) settings.customCommands.splice(index, 1)
    }
    else if (flags.list) {
        console.log(JSON.stringify(settings, null, 2))
        return
    }

    await saveUserSettings(settings)
}
