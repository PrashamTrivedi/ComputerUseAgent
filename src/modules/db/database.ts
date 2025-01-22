import {Database} from "@db/sqlite"
import {join} from "jsr:@std/path"
import {ensureDir} from "jsr:@std/fs"
import {homedir} from "node:os"
import {format} from "jsr:@std/datetime"
import {log} from "../../config/logging.ts"

export type PromptEntry = {
    id: number
    timestamp: string
    mode: string
    prompt: string
    result: string
    tokens_used: number
    cost: number
}

export class PromptDatabase {
    private db: Database

    constructor() {
        try {
            const dbPath = join(homedir(), ".ComputerUseAgent", "data")
            // Ensure directory exists with recursive creation
            ensureDir(dbPath)

            const dbFile = join(dbPath, "history.db")
            this.db = new Database(dbFile)
            this.initialize()
        } catch (error) {
            log.error(`Failed to initialize database: ${error}`)
            throw new Error(`Database initialization failed: ${error}`)
        }
    }

    private initialize() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        mode TEXT NOT NULL,
        prompt TEXT NOT NULL,
        result TEXT,
        tokens_used INTEGER,
        cost REAL
      )
    `)
    }

    async savePrompt(data: {
        mode: string
        prompt: string
        result: string
        tokens_used: number
        cost: number
    }) {

        const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss")
        const number = await this.db.exec(
            `INSERT INTO prompts (timestamp, mode, prompt, result, tokens_used, cost)
             VALUES (:timestamp, :mode, :prompt, :result, :tokens, :cost)`,
            {
                timestamp,
                mode: data.mode,
                prompt: data.prompt,
                result: data.result,
                tokens: data.tokens_used,
                cost: data.cost
            }
        )
        log.debug({number})
        return number
    }

    listPrompts(limit = 10) {
        const stmt = this.db.prepare(
            `SELECT * FROM prompts ORDER BY timestamp DESC LIMIT ?`
        )
        const results = stmt.all(limit)
        return results.map((row: any) => ({
            id: row.id,
            timestamp: row.timestamp,
            mode: row.mode,
            prompt: row.prompt,
            result: row.result,
            tokens_used: row.tokens_used,
            cost: row.cost
        }))
    }

    getPromptById(id: number): PromptEntry | null {
        const stmt = this.db.prepare(
            `SELECT * FROM prompts WHERE id = ?`
        )
        const results = stmt.all(id)
        return results.length === 0 ? null : {
            id: results[0].id,
            timestamp: results[0].timestamp,
            mode: results[0].mode,
            prompt: results[0].prompt,
            result: results[0].result,
            tokens_used: results[0].tokens_used,
            cost: results[0].cost
        }
    }
}
