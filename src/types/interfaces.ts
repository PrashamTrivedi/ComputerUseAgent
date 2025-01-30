export interface ToolCall {
  type: string
  name: string
  id: string
  input: {
    command: string
    path: string
    file_text?: string
    old_str?: string
    new_str?: string
    insert_line?: number
  }
}

export interface ToolResult {
  tool_call_id: string
  output: {
    type: string
    content: Array<{type: string; text: string}>
    tool_use_id: string
    is_error: boolean
  }
}

export interface SystemInfo {
  os: string
  arch: string
  isWsl: boolean
  shell: string
}

export interface Memory {
  id: string
  content: string
  timestamp: number
}

export interface MemoryFile {
  memories: Memory[]
}

export interface UserSettings {
  userName: string
  customCommands: {
    name: string
    description: string
    helpCommand?: string
    helpText?: string
  }[]
  jinaApiKey?: string
  toolConfigPath: string
}

export interface ToolConfig {
  toolName: string
  command: string
  input: string
  output: string
  description: string
  enabled: boolean
}
