import {Memory, MemoryFile} from "../../types/interfaces.ts"
import {log} from "../../config/logging.ts"
import {MEMORY_PATH} from "../../config/constants.ts"

export class MemoryManager {
    private async readMemoryFile(): Promise<MemoryFile> {
        try {
            const content = await Deno.readTextFile(MEMORY_PATH)
            return JSON.parse(content)
        } catch {
            return {memories: []}
        }
    }

    private async writeMemoryFile(data: MemoryFile): Promise<void> {
        console.log(`Writing memory file: ${JSON.stringify(data, null, 2)}`)
        await Deno.writeTextFile(MEMORY_PATH, JSON.stringify(data, null, 2))
    }

    async addMemory(content: string): Promise<Memory> {
        console.log(`Adding into file: ${content}`)
        const memoryFile = await this.readMemoryFile()
        const newMemory: Memory = {
            id: crypto.randomUUID(),
            content,
            timestamp: Date.now(),
        }

        memoryFile.memories.push(newMemory)
        await this.writeMemoryFile(memoryFile)
        return newMemory
    }

    async getMemories(): Promise<Memory[]> {
        log.info(`Getting memories`)
        const memoryFile = await this.readMemoryFile()
        return memoryFile.memories
    }

    async clearMemories(): Promise<void> {
        log.info(`Clearing memories`)
        await this.writeMemoryFile({memories: []})
    }
}
