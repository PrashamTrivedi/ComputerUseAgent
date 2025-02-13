# Development Conventions

## Project Overview

ComputerUseAgent is an AI-powered CLI tool that enables controlled execution of
system operations through LLM guidance. At its core, the project uses the Claude
3 API to interpret user requests and execute them through predefined tools.

## Key Components

- [`HybridSession`](src/modules/hybrid/hybrid_session.ts): The primary execution
  engine
- [`ToolHandler`](src/utils/tool_handler.ts): Manages tool registration and
  execution
- [`PlannerModule`](src/modules/planner/planner.ts): Creates execution plans for
  complex operations

## Core Conventions

### Session Management

- All operations must go through the planning phase first
- Each session generates a unique ID for tracking and logging
- Sessions maintain their own message history and token usage

### Tool Implementation

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

### Command Implementation

When adding new commands:

1. Create a new file in `src/commands/` following existing patterns (see
   `history.ts`, `export.ts`)
2. Define command flags using `ParseOptions` interface
3. Update help text in `parseFlagForHelp` function
4. Register command in `main.ts` command handler section

Example command structure:

```typescript
export async function handleNewCommand(args: string[]) {
  const commandFlags = {
    string: ["option1", "option2"],
    boolean: ["flag1"],
    default: {
      option1: "default",
      flag1: false,
    },
  };
  const flags = parseArgs(args, commandFlags);

  if (flags.help || flags._[1] === "help") {
    console.log(parseFlagForHelp(commandFlags));
    return;
  }
  // Command implementation
}
```

### Error Handling

- Tool errors should be captured and logged, not thrown
- All errors must be logged with proper context
- Sessions should gracefully handle tool failures

### Logging

- Use structured logging via `log`
- Token usage must be tracked for all API calls
- Session steps must be logged for audit trails


### LLM Interactions

- Keep system prompts in `constants.ts`
- Messages must maintain conversation context
- Tool calls should be processed sequentially

## Best Practices

1. Always use typed interfaces for tool inputs/outputs
2. Log execution steps and tool usage
3. Validate tool configurations before use
4. Handle API rate limits gracefully
5. Maintain clear session boundaries

## Anti-Patterns

- Directly executing shell commands without planning
- Mixing session contexts
- Bypassing the tool handler interface
- Hardcoding system prompts in code
- Ignoring token usage tracking

Note: Editor and Bash sessions are legacy components scheduled for deprecation.
New features should focus on extending the HybridSession functionality.
