# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run in development mode with file watching
deno task dev

# Build executable for local use  
deno task buildLocal

# Build for distribution
deno task build

# Run directly from source
deno run -A src/main.ts --mode=editor "your prompt"
deno run -A src/main.ts --mode=bash "your command"
deno run -A src/main.ts "your request"  # Default hybrid mode
```

## Core Architecture

ComputerUseAgent is a Deno-based AI CLI tool that uses Claude 3 API to execute user requests through a planning-based approach. The architecture centers around three key components:

### Session Management
- **HybridSession** (`src/modules/hybrid/hybrid_session.ts`): Primary execution engine that orchestrates the entire process
- **PlannerModule** (`src/modules/planner/planner.ts`): Generates execution plans by breaking down user requests into actionable steps
- **BaseSession** (`src/utils/session.ts`): Provides common session functionality including message history and token tracking

### Tool System
- **ToolHandler** (`src/utils/tool_handler.ts`): Central registry that manages all available tools and routes tool calls
- **DynamicToolHandler** (`src/utils/dynamic_tool_handler.ts`): Handles user-configurable tools defined in tool config files
- Built-in tools include bash execution, text editing, memory management, clipboard operations, and Jina API integration

### Configuration Management
- Tool configurations are loaded from JSON files and validated before use
- User settings are managed through `src/config/settings.ts`
- System constants and API configuration in `src/config/constants.ts`

## Execution Flow

1. User request enters through `main.ts` command parser
2. HybridSession creates execution plan using PlannerModule
3. Each plan step is executed sequentially through Claude API
4. Tool calls are processed by ToolHandler and routed to appropriate handlers
5. Results are logged to database and session history is maintained

## Command Structure

When adding new commands:
1. Create handler in `src/commands/` following existing patterns
2. Define command flags and help text
3. Register in `main.ts` command routing section
4. Follow the pattern: validate flags → handle help → execute logic

## Tool Development

Custom tools are defined in JSON configuration files with this structure:
```typescript
interface ToolConfig {
  toolName: string;
  command: string;
  output: string;
  inputs: ToolInputConfig[];
  description: string;
  enabled: boolean;
}
```

## Key Files to Understand

- `src/main.ts`: Entry point and command routing
- `src/modules/hybrid/hybrid_session.ts`: Core execution logic
- `src/utils/tool_handler.ts`: Tool registration and execution
- `src/config/constants.ts`: System prompts and API configuration
- `CONVENTIONS.md`: Detailed development patterns and anti-patterns

## Important Notes

- Legacy EditorSession and BashSession are deprecated; focus on HybridSession
- All operations go through planning phase first
- Tool errors are captured and logged, not thrown
- Follow Anthropic tool calling conventions in `prompts/tool_calling_anthropic.md`
- Token usage must be tracked for all API calls
- Session boundaries must be maintained clearly