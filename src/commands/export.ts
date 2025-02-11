import {parseArgs} from "jsr:@std/cli/parse-args"
import {PromptDatabase} from "../modules/db/database.ts"
import {log} from "../config/logging.ts"
import {parseFlagForHelp} from "../utils/functions.ts"
import {format} from "jsr:@std/datetime"
import {join} from "jsr:@std/path"
import {ensureDir} from "jsr:@std/fs"

export async function handleExport(args: string[]) {
    const db = new PromptDatabase()
    const commandFlags = {
        string: ["session"],
        boolean: ["help"],
    }

    const flags = parseArgs(args, commandFlags)

    if (flags.help) {
        console.log(parseFlagForHelp(commandFlags))
        return
    }

    if (!flags.session) {
        console.error("Session ID is required. Use --session <id>")
        return
    }

    try {
        const markdown = await db.exportSessionToMarkdown(flags.session)

        // Create exports directory
        const exportDir = join(Deno.cwd(), "exports")
        await ensureDir(exportDir)

        // Generate filename with timestamp
        const filename = `session_${flags.session}_${format(new Date(), "yyyyMMdd_HHmmss")}.md`
        const filepath = join(exportDir, filename)

        // Write markdown to file
        await Deno.writeTextFile(filepath, markdown)

        console.log(`Session log exported to: ${filepath}`)
    } catch (error) {
        log.error(`Error exporting session: ${error}`)
        console.error(`Failed to export session: ${error}`)
    }
}