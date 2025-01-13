import {join} from "jsr:@std/path"
import Anthropic from "npm:@anthropic-ai/sdk"
import {homedir} from "node:os"

export const EDITOR_DIR = join(homedir(), ".ComputerUseAgent", "editor_dir")
export const SESSIONS_DIR = join(homedir(), ".ComputerUseAgent", "sessions")
export const LOGS_DIR = join(homedir(), ".ComputerUseAgent", "logs")

export const EDITOR_SYSTEM_PROMPT = Deno.env.get("EDITOR_SYSTEM_PROMPT") ??
    `You are a helpful assistant that helps users edit and work with text files.
        You have the access of full file system, and you are currently in ${Deno.cwd()} directory.
        Some rules for you to take care of
        - All the paths you provide and use should be related to current directory.
        - If user asks you to work with current directory or file from current directory, you can use '.' or './' as prefix. 
        - If user asks you to work with any subdirectory, it should be relative to current directory.
        - If user asks you to refer to memory, read /root/memory.json file.`

export const BASH_SYSTEM_PROMPT = `
You are a helpful assistant that can execute shell command.
You operate in the environment mentioned in <SystemInfo> tag.
Please ensure all commands are compatible with this environment.
`

export const API_CONFIG = {
    MODEL: "claude-3-5-sonnet-20241022",
    INTENT_MODEL: "claude-3-5-haiku-20241022",
    MAX_TOKENS: 4096,
    MAX_INTENT_TOKENS: 20,
}

export const MEMORY_TOOLS: Anthropic.Beta.BetaToolUnion[] = [
    {
        name: "add_memory",
        description: "Add a new memory to the system",
        type: "custom",
        input_schema: {
            type: "object",
            properties: {
                content: {
                    type: "string",
                    description: "The content to store in memory",
                },
            },
            required: ["content"],
        },
    },
    {
        type: "custom",
        name: "get_memories",
        description: "Retrieve all stored memories",
        input_schema: {
            type: "object",
            properties: {},
        },
    },
    {
        type: "custom",
        name: "clear_memories",
        description: "Clear all stored memories",
        input_schema: {
            type: "object",
            properties: {},
        },
    },
]
