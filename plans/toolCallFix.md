# Tool Configuration Plan by Model

This document outlines the tool configurations that need to be adjusted based on the selected Claude model for optimal computer use functionality.

## Current Implementation Analysis

Based on the codebase analysis, the current implementation in `src/modules/hybrid/hybrid_session.ts:62-68` uses hardcoded tool configurations:

```typescript
tools: [
  {type: "bash_20241022", name: "bash"},
  {type: "text_editor_20241022", name: "str_replace_editor"},
  ...tools
],
betas: ["computer-use-2024-10-22"],
```

## Model-Specific Tool Configurations

### Claude 4 (claude-sonnet-4-20250514, claude-opus-4-20250514)
- **Bash Tool**: `bash_20250124`
- **Text Editor Tool**: `text_editor_20250429` (without `undo_edit` capability)
- **Beta Header**: `computer-use-2025-01-24`
- **Special Features**: 
  - Supports thinking capability with token budget
  - Latest tool versions with enhanced capabilities

### Claude Sonnet 3.7 (claude-3-7-sonnet-20250219)
- **Bash Tool**: `bash_20250124`
- **Text Editor Tool**: `text_editor_20250124` (includes `undo_edit` capability)
- **Bash Tool**: `bash_20250124`
- **Beta Header**: `computer-use-2025-01-24`
- **Special Features**:
  - Supports thinking capability with token budget
  - Latest bash tools like Claude 4
  - Different text editor version with undo functionality

### Claude Sonnet 3.5 (claude-3-5-sonnet-20241022)
- **Bash Tool**: `bash_20241022`
- **Text Editor Tool**: `text_editor_20241022`
- **Beta Header**: `computer-use-2024-10-22`
- **Special Features**:
  - Current implementation (no changes needed)
  - No thinking capability
  - Legacy beta header

## Implementation Requirements

### 1. Tool Configuration Mapping
Create a model-to-tool mapping in `src/config/constants.ts`:

```typescript
interface ModelToolConfig {
  textEditorTool: string;
  bashTool: string;
  betaHeader: string;
  supportsThinking: boolean;
}

const MODEL_TOOL_CONFIGS: Record<string, ModelToolConfig> = {
  'claude-3-5-sonnet-20241022': {
    textEditorTool: 'text_editor_20241022',
    bashTool: 'bash_20241022',
    betaHeader: 'computer-use-2024-10-22',
    supportsThinking: false
  },
  'claude-3-7-sonnet-20250219': {
    textEditorTool: 'text_editor_20250124',
    bashTool: 'bash_20250124',
    betaHeader: 'computer-use-2025-01-24',
    supportsThinking: true
  },
  'claude-sonnet-4-20250514': {
    textEditorTool: 'text_editor_20250429',
    bashTool: 'bash_20250124',
    betaHeader: 'computer-use-2025-01-24',
    supportsThinking: true
  },
  'claude-opus-4-20250514': {
    textEditorTool: 'text_editor_20250429',
    bashTool: 'bash_20250124',
    betaHeader: 'computer-use-2025-01-24',
    supportsThinking: true
  }
};

export function getModelToolConfig(model: string): ModelToolConfig {
  return MODEL_TOOL_CONFIGS[model] || MODEL_TOOL_CONFIGS['claude-3-7-sonnet-20250219'];
}
```

### 2. API Client Configuration Update
**File**: `src/modules/hybrid/hybrid_session.ts:58-69`

**Current hardcoded implementation**:
```typescript
const response = await this.client.beta.messages.create({
  model: apiConfig.MODEL,
  max_tokens: apiConfig.MAX_TOKENS,
  messages: this.messages,
  tools: [
    {type: "bash_20241022", name: "bash"},
    {type: "text_editor_20241022", name: "str_replace_editor"},
    ...tools
  ],
  system: this.cachedSystemPrompt,
  betas: ["computer-use-2024-10-22"],
})
```

**Required dynamic implementation**:
```typescript
const toolConfig = getModelToolConfig(apiConfig.MODEL);
const response = await this.client.beta.messages.create({
  model: apiConfig.MODEL,
  max_tokens: apiConfig.MAX_TOKENS,
  messages: this.messages,
  tools: [
    {type: toolConfig.bashTool, name: "bash"},
    {type: toolConfig.textEditorTool, name: "str_replace_editor"},
    ...tools
  ],
  system: this.cachedSystemPrompt,
  betas: [toolConfig.betaHeader],
})
```

### 3. Text Editor Capability Handling
**File**: `src/types/interfaces.ts:75`

The `FileTool` interface currently includes `undo_edit` command:
```typescript
export interface FileTool {
  command: 'view' | 'create' | 'str_replace' | 'insert' | 'undo_edit'
  // ...
}
```

**Required change**: Make `undo_edit` conditionally available based on model tool configuration.

### 4. System Prompt Template Updates
**File**: `src/config/constants.ts:50-144`

The `SYSTEM_PROMPT_TEMPLATE` hardcodes tool names in the documentation section. Need to make this dynamic based on model configuration.

### 5. Thinking Capability Integration
Already implemented in `src/config/constants.ts:157-160`:
```typescript
function shouldUseThinking(mainModel: string): boolean {
    const modelMap = getModelMap()
    return mainModel !== modelMap["3.5-sonnet"]
}
```

This logic aligns with the tool configuration requirements.

## Files to Modify

### Primary Implementation Files

1. **`src/config/constants.ts`**
   - **Line 1-4**: Add import for `getModelToolConfig` function
   - **Add**: `ModelToolConfig` interface and `MODEL_TOOL_CONFIGS` mapping
   - **Add**: `getModelToolConfig()` helper function
   - **Optional**: Update `SYSTEM_PROMPT_TEMPLATE` to be dynamic (lines 50-144)

2. **`src/modules/hybrid/hybrid_session.ts`**
   - **Line 2**: Add import for `getModelToolConfig` from constants
   - **Lines 62-68**: Replace hardcoded tool types and beta headers with dynamic configuration
   - **Implementation Priority**: HIGH - This is the main API call site

3. **`src/modules/planner/planner.ts`**
   - ✅ **No changes needed** - Uses `claude.messages.create()` without tool configurations (line 44)
   - Already uses dynamic model selection via `apiConfig.REASONING_MODEL` (line 27)

### Secondary Files (If Needed)

4. **`src/types/interfaces.ts`**
   - **Line 76**: Consider making `undo_edit` conditional in `FileTool` interface
   - **Implementation Priority**: LOW - Only if undo_edit validation is required

5. **`src/modules/editor/handlers.ts`**
   - Check if editor handlers need to be aware of model capabilities
   - Update undo_edit handling based on model tool configuration

### Files Already Configured (No Changes Needed)

- **`src/config/settings.ts`**: Model mapping already implemented (lines 5-66)
- **`src/config/constants.ts`**: Thinking capability logic already exists (lines 157-160)

## Current Implementation Status

Based on `plans/configurableModels.md`, the following are already implemented:
- ✅ Model selection in settings (MODEL_MAP in settings.ts)
- ✅ Dynamic model configuration (getSelectedModel() function)
- ✅ Thinking capability control (shouldUseThinking() function)
- ✅ Model-specific token usage tracking (SESSION_LOGGER class)

**Missing Implementation**: Tool configuration mapping based on selected model.

## Implementation Priority

### Critical (Must Fix)
1. **`src/modules/hybrid/hybrid_session.ts:62-68`** - Main API call using hardcoded tools
2. **`src/config/constants.ts`** - Add model-tool mapping configuration

### Important (Should Fix)
3. Search for any other files making direct API calls with tool configurations
4. Validate no other hardcoded `computer-use-2024-10-22` beta headers exist

### Optional (Nice to Have)
5. Dynamic system prompt template
6. Conditional undo_edit capability handling

## Testing Strategy

### Model-Specific Tool Tests
```bash
# Test with 3.5 Sonnet (current default)
deno run -A src/main.ts --mode=hybrid "test bash and editor tools"

# Test with 3.7 Sonnet
deno run -A src/main.ts settings --set-model "3.7-sonnet"
deno run -A src/main.ts --mode=hybrid "test undo_edit capability"

# Test with 4 Sonnet
deno run -A src/main.ts settings --set-model "4-sonnet"
deno run -A src/main.ts --mode=hybrid "test latest tool versions"
```

### Validation Tests
- Verify correct beta headers in API calls
- Confirm tool types match expected model versions
- Test thinking capability with supported models

## Risk Assessment

### High Risk
- **API Call Failures**: If wrong tool versions are used with incompatible models
- **Beta Header Mismatches**: Could cause API rejections

### Medium Risk  
- **Feature Degradation**: undo_edit not available where expected
- **Cost Implications**: No validation for expensive model selections

### Low Risk
- **System Prompt Inconsistencies**: Static documentation vs dynamic tools