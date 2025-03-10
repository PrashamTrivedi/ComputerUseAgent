import {parseArgs} from "jsr:@std/cli/parse-args"
import {PromptDatabase, type PromptEntry} from "../modules/db/database.ts"
import {HistoryViewer} from "../modules/cli/history_viewer.ts"
import {log} from "../config/logging.ts"
import {parseFlagForHelp} from "../utils/functions.ts"

export async function handleHistory(args: string[]) {
    const db = new PromptDatabase()
    const commandFlags = {
        string: ["view", "limit"],
        default: {limit: "10"},
    }
    const flags = parseArgs(args, commandFlags)
    if (flags._[1] === 'help') {
        console.log(parseFlagForHelp(commandFlags))
        return
    }

    try {
        if (flags.view) {
            const id = parseInt(flags.view)
            log.debug(`Viewing entry with ID ${id}`)
            if (isNaN(id)) {
                console.error("Invalid ID provided")
                return
            }
            const entry = db.getPromptById(id)

            if (entry) {
                let sessionLogs = undefined
                if (entry.session_id) {
                    sessionLogs = await db.getSessionLogs(entry.session_id)
                }
                HistoryViewer.displayEntry(entry, sessionLogs)
            } else {
                console.error(`No entry found with ID ${id}`)
            }
        } else {
            const limit = parseInt(flags.limit || "10")
            const entries: PromptEntry[] = db.listPrompts(isNaN(limit) ? 10 : limit)
            HistoryViewer.displayHistory(entries)
        }
    } catch (error) {
        log.error(`Error displaying history: ${error}`)
    }
}
