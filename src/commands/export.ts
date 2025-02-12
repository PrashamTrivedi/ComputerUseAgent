import {parseArgs} from "jsr:@std/cli/parse-args"
import {PromptDatabase} from "../modules/db/database.ts"
import {log} from "../config/logging.ts"
import {parseFlagForHelp} from "../utils/functions.ts"
import {format} from "jsr:@std/datetime"
import {join} from "jsr:@std/path"
import {ensureDir} from "jsr:@std/fs"
import {EXPORT_PATH} from "../config/constants.ts"

export async function handleExport(args: string[]) {
    const db = new PromptDatabase()
    const commandFlags = {
        string: ["id", "path"],
        boolean: ["help"],
        default: {
            help: false,
            path: EXPORT_PATH,
        },
    }

    const flags = parseArgs(args, commandFlags)

    if (flags.help) {
        console.log(parseFlagForHelp(commandFlags))
        return
    } else if (flags._[1] === "help") {
        console.log(parseFlagForHelp(commandFlags))
        return
    }

    if (!flags.id) {
        console.error("Prompt ID is required. Use --id <number>")
        return
    }

    try {
        const id = parseInt(flags.id)
        const markdown = await db.exportSessionToMarkdown(id)

        // Create exports directory using provided path or default
        const exportDir = flags.path
        await ensureDir(exportDir)

        // Generate filename with timestamp
        const filename = `prompt_${flags.id}_${format(new Date(), "yyyyMMdd_HHmmss")}.md`
        const filepath = join(exportDir, filename)

        // Write markdown to file
        await Deno.writeTextFile(filepath, markdown)

        console.log(`Prompt log exported to: ${filepath}`)
    } catch (error) {
        log.error(`Error exporting prompt: ${error}`)
        console.error(`Failed to export prompt: ${error}`)
    }
}