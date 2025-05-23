import {join} from "jsr:@std/path"
import Anthropic from "anthropic"
import {homedir} from "node:os"
import {isJinaAvailable, loadUserSettings, getSelectedModel, getModelMap} from "./settings.ts"

export const EDITOR_DIR = join(homedir(), ".ComputerUseAgent", "editor_dir")
export const SESSIONS_DIR = join(homedir(), ".ComputerUseAgent", "sessions")
export const LOGS_DIR = join(homedir(), ".ComputerUseAgent", "logs")
export const EXPORT_PATH = join(homedir(), ".ComputerUseAgent", "exports")
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
Think step by step and prepare a plan for an agent running on CLI, 
you will pass the generated plan to the agent and it will execute it according to the steps you will give them. 

Make sure your steps will fulfill the user request,
user's requests and current system information will be provided to you in their respective tags. 

The agent will have access to some tools, including bash and file system access, 
additionally there will be some other tools, whose names will be provided to you in  <Tools> tag.

Evaluate the user's request; if this is a simple request like a greeting, requesting information, or advice which can be done without any tools, simply respond with '[{step:0,action:'Reply to the user'}]'
However, for anything more complex, reflect on system information to create a step-by-step plan that the agent can follow.
Make sure each step can be executed independently of each other, but still have the ability to build on the previous steps.
Also, make sure each step can respect the system information, and the user request.
You should respond with a detailed JSON plan having the following shape: 
[{step:1,action:'Action to be taken to achieve the goal'},"..."]
ONLY Respond in JSON without any codefences or any other details. 
`


export const SYSTEM_PROMPT_TEMPLATE = `
You are a versatile assistant with full system access.
You are currently operating in \${Deno.cwd()} directory.

System Information:
\${systemInfo}

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

\${additionalTools}



\${userContext}
\${additionalInstructions ?? ''}



Follow these rules:

1. File and Directory Operations:
   - Use BASH_TOOL for all file/directory operations
   - Default command structure:
     \`\`\`
     For files: {command: "rg [options] 'pattern' [file-pattern]"}
     For dirs: {command: "tree . [options] [conditions]"}
\`\`\`

2. Content Search with ripgrep (rg):
   - Always include these base options:
     \`\`\`
--type - not=lock     # Exclude lockfiles
--hidden           # Include hidden files
    - l                 # Only show file names
        \`\`\`
   - Common usage patterns:
     \`\`\`
Search in YAML: {command: "rg --type-not=lock --hidden -t yaml 'pattern'"}
     Specific files: {command: "rg --type-not=lock --hidden -g 'serverless.yml' 'pattern'"}
     Multiple patterns: {command: "rg --type-not=lock --hidden -e 'pattern1' -e 'pattern2'"}
\`\`\`


3. File Editing:
   - Use EDITOR_TOOL for all file modifications
   - Always provide exact file paths (use BASH_TOOL with tree/rg first if needed)

4. Data Management:
   - Use MEMORY_TOOLS when something you find will be needed later
   - Use CLIPBOARD_TOOLS only when user tells you to read from clipboard

5. External Resources:
   - Use JINA_TOOLS for web content and online searches

Note: When chaining operations, use separate BASH_TOOL commands and store results in MEMORY_TOOLS if needed.

`

function getReasoningModel(mainModel: string): string {
    const modelMap = getModelMap()

    if (mainModel === modelMap["3.5-sonnet"]) {
        return modelMap["3.7-sonnet"]
    } else {
        return mainModel
    }

}

function shouldUseThinking(mainModel: string): boolean {
    const modelMap = getModelMap()
    return mainModel !== modelMap["3.5-sonnet"]
}

export function getAPIConfig() {
    const selectedModel = getSelectedModel()
    const reasoningModel = getReasoningModel(selectedModel)
    const useThinking = shouldUseThinking(selectedModel)

    return {
        MODEL: selectedModel,
        REASONING_MODEL: reasoningModel,
        INTENT_MODEL: "claude-3-5-haiku-20241022",
        USE_THINKING: useThinking,
        MAX_TOKENS: 8192,
        MIN_THINKING_TOKENS: useThinking ? 1024 : 0,
        MAX_TOKENS_WHEN_THINKING: useThinking ? 20000 : 8192,
        MAX_INTENT_TOKENS: 20,
    }
}

export const API_CONFIG = getAPIConfig()

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

interface SchemaProperty {
    type: string
    description?: string
}

export function getSystemContext(
    additionalTools: Anthropic.Beta.Messages.BetaTool[] = [],
    systemInfo: string = '{}',
    additionalInstructions?: string,
): string {
    const settings = loadUserSettings()

    const toolsString = additionalTools.map(tool => {
        const schema = tool.input_schema as {
            type: string
            properties: Record<string, SchemaProperty>
            required?: string[]
        }
        return `
- ${tool.name.toUpperCase()}:
    - Name: "${tool.name}"
    - Description: ${tool.description}
    - Arguments: ${Object.entries(schema.properties)
                .map(([name, prop]) => `
        - ${name}: ${prop.type}${schema.required?.includes(name) ? ' (required)' : ''} - ${prop.description || ''}`)
                .join('')}
`
    }).join('\n')

    const userContext = `
User Context:
- Name: ${settings.userName}
`

    return SYSTEM_PROMPT_TEMPLATE
        .replace('${Deno.cwd()}', Deno.cwd())
        .replace('${additionalTools}', toolsString)
        .replace('${userContext}', userContext)
        .replace('${systemInfo}', systemInfo)
        .replace('${additionalInstructions ?? \'\'}', additionalInstructions ?? '')
}