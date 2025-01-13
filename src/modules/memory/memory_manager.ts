import {Memory, MemoryFile} from "../../types/interfaces.ts"
import {log} from "../../config/logging.ts"

export class MemoryManager {
    private memoryPath = "/root/memory.json";

    private async readMemoryFile(): Promise<MemoryFile> {
        try {
            const content = await Deno.readTextFile(this.memoryPath)
            return JSON.parse(content)
        } catch {
            return {memories: []}
        }
    }

    private async writeMemoryFile(data: MemoryFile): Promise<void> {
        console.log(`Writing memory file: ${JSON.stringify(data, null, 2)}`)
        await Deno.writeTextFile(this.memoryPath, JSON.stringify(data, null, 2))
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
        const memoryFile = await this.readMemoryFile()
        return memoryFile.memories
    }

    async clearMemories(): Promise<void> {
        await this.writeMemoryFile({memories: []})
    }
}
