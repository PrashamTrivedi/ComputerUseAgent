import {join} from "jsr:@std/path"
import Anthropic from "anthropic"
import {homedir} from "node:os"
import {isJinaAvailable, loadUserSettings} from "./settings.ts"

export const EDITOR_DIR = join(homedir(), ".ComputerUseAgent", "editor_dir")
export const SESSIONS_DIR = join(homedir(), ".ComputerUseAgent", "sessions")
export const LOGS_DIR = join(homedir(), ".ComputerUseAgent", "logs")
export const DEFAULT_TOOLS_CONFIG_PATH = join(homedir(), ".ComputerUseAgent", "settings.json")
export const MEMORY_PATH = "/root/memory.json"

export const DEFAULT_EDITOR = Deno.env.get("EDITOR") ?? "nano"

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

export const PLANNER_SYSTEM_PROMPT = `
You prepare plans for an agentic system. 
You will receive the user request, current system information in their respective tags. 
Use this information to create a step by step plan for the agent to follow.
Evaluate the user's request, if this is a simple request like a greeting, requesting information or advice which can be done without any tools simply respond with 'Reply to the user.'.
However for anything more complex. Reflect on system information to create a step by step plan that agent can follow.
You should respond with detailed JSON plan having the following shape: 
[{step:1,action:'Action to be taken to achieve the goal'},"..."]
ONLY Respond in JSON without any codefences or any other details
`
export const COMBINED_SYSTEM_PROMPT = `
You are a versatile assistant with full system access.
You are currently operating in ${Deno.cwd()} directory.

You have access to following tools and capabilities:

- BASH_TOOL:
    - Name: "bash"
    - Description: Execute shell commands
    - Arguments:
        - command: string (required) - The shell command to execute
        - restart: boolean (optional) - Restart shell session if true
        - Example: {command: "ls -la", restart: false}

- EDITOR_TOOL:
    - Name: "str_replace_editor"
    - Description: File manipulation operations
    - Commands:
        - view:
            - path: string (required)
        - create:
            -path: string (required)
            - file_text: string (required)
        - str_replace:
            - path: string (required)
            - old_str: string (required)
            - new_str: string (required)
        - insert:
            - path: string (required)
            - insert_line: number (required)
            - new_str: string (required)
- MEMORY_TOOLS:
    - Name: "add_memory"
    - Arguments: {content: string}
    - Name: "get_memories"
    - Arguments: none
    - Name: "clear_memories"
    - Arguments: none
- CLIPBOARD_TOOLS:
    - Name: "read_clipboard"
    - Arguments: none
${isJinaAvailable() ? `
- JINA_TOOLS:
    - Name: "readPage"
    - Arguments: {url: string}
    - Name: "search"
    - Arguments: {searchTerm: string}
    - Name: "searchGrounding"
    - Arguments: {searchTerm: string}
` : ''}

Before taking any action, follow these steps:


Some tips:
- For any non file operations, use the BASH_TOOL
- If you need to locate the file, use BASH_TOOL to find the file path
- EDITOR_TOOL works best when you have the exact file path to work with
- Best way to write or update a file is to use EDITOR_TOOL.
- If an information is needed to be stored for future reference, use MEMORY_TOOLS.


Your capabilities include:

1. File System Access:
   - Full access to read and edit files
   - All paths should be relative to current directory
   - Use './' or '.' for current directory references
   - Use relative paths for subdirectories

2. Command Execution:
   - Can execute shell commands in the current environment
   - Ensure commands are compatible with the system
   - Can navigate and manipulate the file system

3. Memory Management:
   - Access to system memory via /root/memory.json
   - Can add, retrieve, and clear memories
   - Use memory for context persistence

4. Clipboard Access:
    - Can read content from the system clipboard
${isJinaAvailable() ? `
5. Jina API Integration:
    - Can read and parse content from a URL
    - Can search content using Jina Search API
    - Can search with grounding using Jina Grounding API
` : ''}

Always present your solution in this order:
1. Understanding of the request
2. Step-by-step plan
3. Detailed execution of each step`

export const API_CONFIG = {
    MODEL: "claude-3-5-sonnet-20241022",
    INTENT_MODEL: "claude-3-5-haiku-20241022",
    MAX_TOKENS: 8192,
    MAX_INTENT_TOKENS: 20,
}

export const MEMORY_TOOLS: Anthropic.Beta.BetaTool[] = [
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
export const CLIPBOARD_TOOLS: Anthropic.Beta.BetaTool[] = [
    {
        type: "custom",
        name: "read_clipboard",
        description: "Read content from system clipboard",
        input_schema: {type: "object", properties: {}, required: []}

    }
]

export const JINA_TOOLS: Anthropic.Beta.BetaTool[] = [
    {
        type: "custom",
        name: "readPage",
        description: "Read and parse content from a URL using Jina Reader API",
        input_schema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The URL to read and parse",
                },
            },
            required: ["url"],
        },
    },
    {
        type: "custom",
        name: "search",
        description: "Search content using Jina Search API",
        input_schema: {
            type: "object",
            properties: {
                searchTerm: {
                    type: "string",
                    description: "The term to search for",
                },
            },
            required: ["searchTerm"],
        },
    },
    {
        type: "custom",
        name: "searchGrounding",
        description: "Search with grounding using Jina Grounding API",
        input_schema: {
            type: "object",
            properties: {
                searchTerm: {
                    type: "string",
                    description: "The term to search for with grounding",
                },
            },
            required: ["searchTerm"],
        },
    },
]

// Remove ALL_TOOLS export and definition

export function getSystemContext(basePrompt: string): string {
    const settings = loadUserSettings()
    const customCommandsContext = settings.customCommands.length > 0
        ? "\nAvailable Commands:\n" + settings.customCommands
            .map(cmd => `- ${cmd.name}: ${cmd.description}${cmd.helpCommand ? `\n  Help: ${cmd.helpCommand}` : ''
                }${cmd.helpText ? `\n  Flags: ${cmd.helpText}` : ''
                }`).join('\n')
        : ''

    return `${basePrompt}
User Context:
- Name: ${settings.userName}${customCommandsContext}`
}