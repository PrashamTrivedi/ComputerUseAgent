import {blue, bold, green, magenta, yellow, red} from "jsr:@std/fmt/colors"
import {Table} from "table"
import type {SessionLogEntry} from "../db/database.ts"

export class HistoryViewer {
    static displayHistory(entries: Array<{
        id: number
        timestamp: string
        mode: string
        prompt: string
        result: string
        tokens_used: number
        cost: number
        session_id?: string
    }>) {
        console.clear()

        const table = new Table()
        table.theme = Table.roundTheme
        table.headers = [
            bold("ID"),
            bold("Time"),
            bold("Mode"),
            bold("Session"),
            bold("Prompt"),
            bold("Cost ($)")
        ]

        table.rows = entries.map(entry => [
            blue(entry.id.toString()),
            green(entry.timestamp),
            yellow(entry.mode),
            entry.session_id ? magenta(entry.session_id) : "-",
            entry.prompt.slice(0, 50) + (entry.prompt.length > 50 ? "..." : ""),
            magenta(entry.cost.toFixed(6))
        ])

        console.log(table.toString())
        console.log("\nUse 'view <id>' to see full details of a specific entry")
    }

    static displayEntry(entry: {
        id: number
        timestamp: string
        mode: string
        prompt: string
        result: string
        tokens_used: number
        cost: number
        session_id?: string
    }, sessionLogs?: SessionLogEntry[]) {
        console.clear()
        console.log(bold("\nPrompt Details:"))
        console.log("═".repeat(50))
        console.log(blue(`ID: ${entry.id}`))
        console.log(green(`Time: ${entry.timestamp}`))
        console.log(yellow(`Mode: ${entry.mode}`))
        if (entry.session_id) {
            console.log(magenta(`Session: ${entry.session_id}`))
        }
        console.log(magenta(`Tokens: ${entry.tokens_used}`))
        console.log(magenta(`Cost: $${entry.cost.toFixed(6)}`))
        console.log("\n" + bold("Prompt:"))
        console.log("─".repeat(50))
        console.log(entry.prompt)
        console.log("\n" + bold("Result:"))
        console.log("─".repeat(50))
        console.log(entry.result)

        if (sessionLogs?.length) {
            console.log("\n" + bold("Session Steps:"))
            console.log("═".repeat(50))
            for (const log of sessionLogs) {
                console.log(blue(`\nStep ${log.step_number}: ${log.step_description}`))
                console.log(green(`Time: ${log.timestamp}`))
                console.log(`Tools: ${Array.isArray(log.tools_used) ? log.tools_used.join(", ") :
                    typeof log.tools_used === 'string' ? JSON.parse(log.tools_used).join(", ") : log.tools_used}`)
                if (log.result) {
                    console.log("\nResult:")
                    console.log(log.result)
                }
                if (log.error) {
                    console.log("\nError:")
                    console.log(red(log.error))
                }
                console.log("─".repeat(50))
            }
        }

        console.log("\n")
    }
}
