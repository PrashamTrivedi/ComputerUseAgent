import {parseArgs} from "jsr:@std/cli/parse-args"
import {PromptDatabase, type PromptEntry} from "../modules/db/database.ts"
import {HistoryViewer} from "../modules/cli/history_viewer.ts"
import {log} from "../config/logging.ts"

export async function handleHistory(args: string[]) {

    const db = new PromptDatabase()
    const flags = parseArgs(args, {
        string: ["view", "limit"],
        default: {limit: "10"},
    })

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
                HistoryViewer.displayEntry(entry)
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
