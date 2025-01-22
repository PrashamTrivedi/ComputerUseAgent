import {blue, bold, green, magenta, yellow} from "jsr:@std/fmt/colors"
import {Table} from "table"

export class HistoryViewer {
    static displayHistory(entries: Array<{
        id: number
        timestamp: string
        mode: string
        prompt: string
        result: string
        tokens_used: number
        cost: number
    }>) {
        console.clear()

        const table = new Table()
        table.theme = Table.roundTheme
        table.headers = [
            bold("ID"),
            bold("Time"),
            bold("Mode"),
            bold("Prompt"),
            bold("Cost ($)")
        ]

        table.rows = entries.map(entry => [
            blue(entry.id.toString()),
            green(entry.timestamp),
            yellow(entry.mode),
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
    }) {
        console.clear()
        console.log(bold("\nPrompt Details:"))
        console.log("═".repeat(50))
        console.log(blue(`ID: ${entry.id}`))
        console.log(green(`Time: ${entry.timestamp}`))
        console.log(yellow(`Mode: ${entry.mode}`))
        console.log(magenta(`Tokens: ${entry.tokens_used}`))
        console.log(magenta(`Cost: $${entry.cost.toFixed(6)}`))
        console.log("\n" + bold("Prompt:"))
        console.log("─".repeat(50))
        console.log(entry.prompt)
        console.log("\n" + bold("Result:"))
        console.log("─".repeat(50))
        console.log(entry.result)
        console.log("\n")
    }
}
