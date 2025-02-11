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
    session_id?: string
}

export type SessionLogEntry = {
    id: number
    session_id: string
    timestamp: string
    step_number: number
    step_description: string
    tools_used: string
    result: string
    error?: string
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
        cost REAL,
        session_id TEXT
      );

      ALTER TABLE prompts ADD COLUMN session_id TEXT DEFAULT NULL;

      CREATE TABLE IF NOT EXISTS session_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        step_description TEXT NOT NULL,
        tools_used TEXT NOT NULL,
        result TEXT,
        error TEXT
      );
    `)
    }

    async savePrompt(data: {
        mode: string
        prompt: string
        result: string
        tokens_used: number
        cost: number
        session_id?: string
    }) {
        const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss")
        const number = await this.db.exec(
            `INSERT INTO prompts (timestamp, mode, prompt, result, tokens_used, cost, session_id)
             VALUES (:timestamp, :mode, :prompt, :result, :tokens, :cost, :session_id)`,
            {
                timestamp,
                mode: data.mode,
                prompt: data.prompt,
                result: data.result,
                tokens: data.tokens_used,
                cost: data.cost,
                session_id: data.session_id
            }
        )
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
            cost: row.cost,
            session_id: row.session_id
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
            cost: results[0].cost,
            session_id: results[0].session_id
        }
    }

    async getPromptBySessionId(sessionId: string): Promise<PromptEntry | null> {
        const stmt = this.db.prepare(
            `SELECT DISTINCT p.*
             FROM prompts p
             INNER JOIN session_logs sl ON p.session_id = sl.session_id
             WHERE sl.session_id = ?`
        )
        const results = stmt.all(sessionId)
        return results.length === 0 ? null : {
            id: results[0].id,
            timestamp: results[0].timestamp,
            mode: results[0].mode,
            prompt: results[0].prompt,
            result: results[0].result,
            tokens_used: results[0].tokens_used,
            cost: results[0].cost,
            session_id: results[0].session_id
        }
    }

    async logSessionStep(data: {
        session_id: string,
        step_number: number,
        step_description: string,
        tools_used: string[],
        result?: string,
        error?: string
    }) {
        const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss")
        await this.db.exec(
            `INSERT INTO session_logs (session_id, timestamp, step_number, step_description, tools_used, result, error)
             VALUES (:session_id, :timestamp, :step_number, :step_description, :tools_used, :result, :error)`,
            {
                session_id: data.session_id,
                timestamp,
                step_number: data.step_number,
                step_description: data.step_description,
                tools_used: JSON.stringify(data.tools_used),
                result: data.result,
                error: data.error
            }
        )
    }

    async getSessionLogs(sessionId: string): Promise<SessionLogEntry[]> {
        const stmt = this.db.prepare(
            `SELECT * FROM session_logs WHERE session_id = ? ORDER BY step_number ASC`
        )
        const results = stmt.all(sessionId)
        return results.map((row: any) => ({
            id: row.id,
            session_id: row.session_id,
            timestamp: row.timestamp,
            step_number: row.step_number,
            step_description: row.step_description,
            tools_used: row.tools_used,
            result: row.result,
            error: row.error
        }))
    }

    async exportSessionToMarkdown(sessionId: string): Promise<string> {
        const session = await this.getPromptBySessionId(sessionId)
        if (!session) {
            throw new Error(`Session ${sessionId} not found`)
        }

        const logs = await this.getSessionLogs(sessionId)

        let markdown = `# Session Log: ${session.id}\n\n`
        markdown += `- **Timestamp**: ${session.timestamp}\n`
        markdown += `- **Mode**: ${session.mode}\n`
        markdown += `- **Total Tokens**: ${session.tokens_used}\n`
        markdown += `- **Total Cost**: $${session.cost.toFixed(6)}\n\n`

        markdown += `## Original Prompt\n\n\`\`\`\n${session.prompt}\n\`\`\`\n\n`

        markdown += `## Execution Steps\n\n`

        for (const log of logs) {
            markdown += `### Step ${log.step_number}: ${log.step_description}\n\n`
            markdown += `- **Time**: ${log.timestamp}\n`
            markdown += `- **Tools Used**: ${log.tools_used}\n\n`

            if (log.result) {
                markdown += `**Result**:\n\`\`\`\n${log.result}\n\`\`\`\n\n`
            }

            if (log.error) {
                markdown += `**Error**:\n\`\`\`\n${log.error}\n\`\`\`\n\n`
            }
        }

        return markdown
    }
}
