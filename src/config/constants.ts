import {join} from "jsr:@std/path"

export const EDITOR_DIR = join(Deno.cwd(), "editor_dir")
export const SESSIONS_DIR = join(Deno.cwd(), "sessions")

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
}
