# Anthropic Tool Calling Conventions

## Overview

Tool calling in the ComputerUseAgent leverages Anthropic's Claude 3 API for executing system operations through well-defined tool interfaces. This document outlines the conventions and best practices for implementing and using tool calls with Anthropic's API.

## Key Components

- Tool Definitions: JSON Schema format specifications
- Tool Results: Structured response handling
- Chain of Thought: Explicit reasoning process
- Error Handling: Standardized error reporting

## Core Conventions

### Tool Definition Structure

```json
{
  "name": "tool_name",
  "description": "Detailed description of the tool's purpose and behavior",
  "input_schema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Description of parameter 1"
      }
    },
    "required": ["param1"]
  }
}
```

### Tool Description Guidelines

1. Must include:
   - Purpose and primary use cases
   - Parameter explanations
   - Usage limitations
   - Expected output format
   - Error conditions

2. Format:
   - Minimum 3-4 sentences
   - Clear, concise language
   - Explicit parameter requirements
   - Example usage scenarios

### Tool Response Handling

Tool responses should follow this structure:
```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "unique_id",
      "content": "result_content",
      "is_error": false
    }
  ]
}
```

### Chain of Thought Implementation

- Use <thinking> tags for reasoning steps
- Include parameter validation logic
- Document tool selection process
- Handle missing parameters gracefully

Example format:
```
<thinking>
1. Analyzing user request
2. Validating required parameters
3. Selecting appropriate tool
4. Preparing tool call
</thinking>
```

### Error Handling

- Tool execution errors must include:
  - Clear error message
  - Error context
  - Suggested resolution
  - is_error flag set to true

Example error response:
```json
{
  "type": "tool_result",
  "tool_use_id": "id",
  "content": "Error: Invalid parameter format",
  "is_error": true
}
```

## Best Practices

1. Tool Definition:
   - Use descriptive tool names
   - Provide comprehensive descriptions
   - Include all required parameters
   - Document optional parameters
   - Specify parameter constraints

2. Parameter Handling:
   - Validate all inputs
   - Handle missing parameters explicitly
   - Use clear parameter descriptions
   - Include parameter type constraints

3. Response Processing:
   - Parse tool results carefully
   - Handle errors gracefully
   - Maintain conversation context
   - Track tool usage metrics

4. Chain of Thought:
   - Document reasoning process
   - Validate assumptions
   - Handle edge cases
   - Provide clear explanations

5. Error Management:
   - Use consistent error formats
   - Include actionable feedback
   - Log error details
   - Handle retries appropriately

## Anti-Patterns

- Avoid:
  - Incomplete tool descriptions
  - Ambiguous parameter names
  - Missing error handling
  - Implicit parameter requirements
  - Undocumented limitations
  - Skipping chain of thought
  - Ignoring tool results
  - Mixing tool contexts

## Model-Specific Considerations

### Claude 3 Opus
- Always use chain of thought
- Leverage detailed reasoning
- Handle complex parameter inference
- Utilize parallel tool calls when appropriate

### Claude 3 Sonnet
- Focus on direct tool calls
- Provide explicit parameters
- Limit inference complexity
- Use sequential tool calls

### Claude 3 Haiku
- Keep tool definitions simple
- Require explicit parameters
- Avoid complex inference
- Use single tool calls

## Token Usage Guidelines

- Track input tokens:
  - Tool definitions
  - System prompts
  - User messages
  - Tool parameters

- Monitor output tokens:
  - Tool results
  - Chain of thought
  - Error messages
  - Response formatting

Note: Token usage varies by model. Refer to pricing documentation for specific model costs.