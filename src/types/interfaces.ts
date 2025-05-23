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
  jinaApiKey?: string
  toolConfigPath: string
  editorCommand: string
  model?: string
}

interface ToolInputConfig {
  name: string
  type: "string" | "number" | "boolean"
  description?: string
  required?: boolean
}

export interface ToolConfig {
  toolName: string
  command: string
  output: string
  inputs: ToolInputConfig[]
  description: string
  enabled: boolean
}

export interface PlanStep {
  step: number
  action: string
}

export interface Plan {
  planSteps: PlanStep[]
}

export interface FileTool {
  command: 'view' | 'create' | 'str_replace' | 'insert' | 'undo_edit'
  path: string
  file_text?: string
  old_str?: string
  new_str?: string
  insert_line?: number
  view_range?: number[]
}

export interface BashTools {
  command?: string
  restart?: boolean
}
