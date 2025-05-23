# Configurable Models Implementation Plan

## Overview
Add user-configurable model selection to ComputerUseAgent, allowing users to choose between different Claude models via settings.

## Supported Models
- `claude-3-5-sonnet-20241022` (3.5 Sonnet) - Default
- `claude-3-7-sonnet-20250219` (3.7 Sonnet) 
- `claude-sonnet-4-20250514` (4 Sonnet)
- `claude-opus-4-20250514` (4 Opus)

## Implementation Steps

### 1. Update UserSettings Interface
- Add `model?: string` field to `UserSettings` interface in `src/types/interfaces.ts`
- Set default model to current model (`claude-3-5-sonnet-20241022`)

### 2. Update Settings Configuration
- Modify `DEFAULT_SETTINGS` in `src/config/settings.ts` to include default model
- Add helper function `getSelectedModel()` to retrieve user's model preference
- Add model validation function to ensure only supported models are allowed

### 3. Update Constants Configuration
- Modify `API_CONFIG` in `src/config/constants.ts` to use configurable model
- Replace hardcoded `MODEL` with dynamic model selection
- **Smart Planner Model Selection**: Configure `REASONING_MODEL` based on main model:
  - If main model is 3.5 Sonnet → Use 3.7 Sonnet for planning BUT exclude thinking budget
  - If main model is 3.7 Sonnet → Use 3.7 Sonnet for planning with thinking capabilities
  - If main model is 4 Sonnet/Opus → Use same model for planning with full thinking capabilities
- Keep `INTENT_MODEL` (Haiku) separate as it serves specific purposes

### 4. Update Settings Command
- Add `--set-model` flag to settings command in `src/commands/settings.ts`
- Add `--list-models` flag to show available models
- Include model validation when setting new model
- Update help text to include model configuration options

### 5. Update Session Classes
- Modify classes that use `API_CONFIG.MODEL` to dynamically get model from settings
- Ensure all Claude API calls use the configured model
- **Implement Thinking Budget Control**: Modify planner to conditionally include thinking based on model
- **Update cost tracking calls**: Add model name parameter to updateTokenUsage() calls
- Key files to update:
  - `src/modules/hybrid/hybrid_session.ts` - Update token tracking with model names
  - `src/modules/planner/planner.ts` - Add logic to exclude thinking budget for 3.5 Sonnet, track planning model costs
  - Any other files that directly reference `API_CONFIG.MODEL`

### 6. Update Cost Tracking Infrastructure
- **SessionLogger class**: Add model-specific token tracking
- **Database schema**: Keep existing cost field for backward compatibility
- **Cost calculation**: Create model pricing lookup function
- **API call sites**: Pass model name to updateTokenUsage() throughout codebase

## Model Mapping
Create a mapping between user-friendly names and actual model identifiers:
```typescript
const MODEL_MAP = {
  "3.5-sonnet": "claude-3-5-sonnet-20241022",
  "3.7-sonnet": "claude-3-7-sonnet-20250219", 
  "4-sonnet": "claude-sonnet-4-20250514",
  "4-opus": "claude-opus-4-20250514"
}
```

## Usage Examples
```bash
# Set model to 4 Sonnet
deno run -A src/main.ts settings --set-model "4-sonnet"

# List available models
deno run -A src/main.ts settings --list-models

# View current settings including model
deno run -A src/main.ts settings --list
```

## Cost Tracking and Reporting

### Model Pricing (as of May 2025)
Based on current Anthropic pricing:

| Model | Input Price (per 1M tokens) | Output Price (per 1M tokens) | With Caching Input (90% off) | With Caching Output (90% off) |
|-------|----------------------------|------------------------------|------------------------------|-------------------------------|
| 3.5 Sonnet | $3.00 | $15.00 | $0.30 | $1.50 |
| 3.7 Sonnet | $3.00 | $15.00 | $0.30 | $1.50 |
| **4 Sonnet** | **$3.00** | **$15.00** | **$0.30** | **$1.50** |
| **4 Opus** | **$15.00** | **$75.00** | **$1.50** | **$7.50** |

### Current Cost Implementation Analysis
**Existing Cost Tracking (SessionLogger in src/utils/session.ts):**
1. **Hard-coded pricing**: Uses fixed $3/$15 per million tokens (3.5/3.7 Sonnet pricing)
2. **Single model tracking**: Only tracks one set of tokens per session 
3. **Simple aggregation**: Combines all token usage regardless of which model was used
4. **Database storage**: Saves total cost per session to SQLite database

**Current Limitations:**
1. **No model-specific costs**: All API calls treated as same model pricing
2. **Planning model invisible**: REASONING_MODEL usage not tracked separately
3. **Fixed pricing**: Doesn't account for different model costs (4 Opus is 5x more expensive)
4. **No per-model breakdown**: Can't see which model consumed which tokens

### Enhanced Cost Tracking Implementation
**Update SessionLogger class (src/utils/session.ts):**
1. **Dynamic pricing**: Replace hard-coded costs with model-specific pricing lookup
2. **Multi-model tracking**: Track tokens per model type (main vs planning)
3. **Cost breakdown**: Maintain separate cost calculations for each model
4. **Backward compatibility**: Keep existing getTotalCost() for database storage

**Changes needed in SessionLogger:**
```typescript
class SessionLogger {
  private modelTokenUsage = new Map<string, {input: number, output: number}>()
  
  updateTokenUsage(inputTokens: number, outputTokens: number, modelName: string): void
  getModelCosts(): Map<string, number>
  getTotalCost(): number // Updated to sum all model costs
}
```

**Update cost calculation methods:**
- Replace hard-coded $3/$15 with dynamic pricing based on model
- Add model parameter to updateTokenUsage() calls
- Modify getTotalCost() to sum costs across all models used

## Validation Rules
- Only allow predefined model names
- Provide clear error messages for invalid models
- Fall back to default model if configured model becomes invalid
- Warn users about cost implications when selecting expensive models

## Backward Compatibility
- Existing users without model setting will use default (3.5 Sonnet)
- No breaking changes to existing functionality
- Settings file will be automatically updated with default model on first access
- Cost tracking will start from implementation date forward