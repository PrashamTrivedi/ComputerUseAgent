import Anthropic from "anthropic"
import {format} from "jsr:@std/datetime"
import {crypto} from "jsr:@std/crypto"
import {log} from "../config/logging.ts"
import {PromptDatabase} from "../modules/db/database.ts"
import {getSystemContext} from "../config/constants.ts"

const MODEL_PRICING = {
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
  "claude-3-5-haiku-20241022": { input: 1.0, output: 5.0 },
} as const

export class SessionLogger {
  private sessionId: string
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private modelTokenUsage = new Map<string, {input: number, output: number}>()
  private logger: log.Logger

  constructor(sessionId: string) {
    this.sessionId = sessionId
    this.logger = log.getLogger()
  }

  updateTokenUsage(inputTokens: number, outputTokens: number, modelName?: string): void {
    this.totalInputTokens += inputTokens
    this.totalOutputTokens += outputTokens
    
    if (modelName) {
      const current = this.modelTokenUsage.get(modelName) || { input: 0, output: 0 }
      this.modelTokenUsage.set(modelName, {
        input: current.input + inputTokens,
        output: current.output + outputTokens
      })
    }
  }

  getModelCosts(): Map<string, number> {
    const modelCosts = new Map<string, number>()
    
    for (const [modelName, usage] of this.modelTokenUsage) {
      const pricing = MODEL_PRICING[modelName as keyof typeof MODEL_PRICING]
      if (pricing) {
        const inputCost = (usage.input / 1_000_000) * pricing.input
        const outputCost = (usage.output / 1_000_000) * pricing.output
        modelCosts.set(modelName, inputCost + outputCost)
      }
    }
    
    return modelCosts
  }

  logTotalCost(): void {
    const modelCosts = this.getModelCosts()
    const totalCost = this.getTotalCost()

    this.logger.info(`Session ${this.sessionId} costs:
      Input tokens: ${this.totalInputTokens}
      Output tokens: ${this.totalOutputTokens}
      Total cost: $${totalCost.toFixed(6)}`)
      
    for (const [modelName, cost] of modelCosts) {
      const usage = this.modelTokenUsage.get(modelName)
      if (usage) {
        this.logger.info(`  ${modelName}: ${usage.input + usage.output} tokens, $${cost.toFixed(6)}`)
      }
    }
  }

  getTotalTokens(): number {
    return this.totalInputTokens + this.totalOutputTokens
  }

  getTotalCost(): number {
    const modelCosts = this.getModelCosts()
    let totalCost = 0
    
    for (const cost of modelCosts.values()) {
      totalCost += cost
    }
    
    // Fallback to legacy calculation if no model-specific tracking
    if (totalCost === 0 && (this.totalInputTokens > 0 || this.totalOutputTokens > 0)) {
      const costPerMillionInputTokens = 3.0
      const costPerMillionOutputTokens = 15.0
      
      const totalInputCost = (this.totalInputTokens / 1_000_000) * costPerMillionInputTokens
      const totalOutputCost = (this.totalOutputTokens / 1_000_000) * costPerMillionOutputTokens
      totalCost = totalInputCost + totalOutputCost
    }
    
    return totalCost
  }
}

export class BaseSession {
  protected client: Anthropic
  protected sessionId: string
  protected logger: SessionLogger
  protected messages: Array<any> = [];
  protected db: PromptDatabase

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? this.createSessionId()
    this.client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    })
    this.logger = new SessionLogger(this.sessionId)
    this.db = new PromptDatabase()
  }

  protected createSessionId(): string {
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss")
    const randomBytes = crypto.getRandomValues(new Uint8Array(3))
    const randomHex = Array.from(randomBytes)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("")
    return `${timestamp}-${randomHex}`
  }

  protected async logInteraction(mode: string, prompt: string, result: string, session_id?: string) {
    const totalTokens = this.logger.getTotalTokens()
    const totalCost = this.logger.getTotalCost()

    await this.db.savePrompt({
      mode,
      prompt,
      result,
      tokens_used: totalTokens,
      cost: totalCost,
      session_id: session_id || this.sessionId
    })
  }

  protected getSystemPrompt(
    additionalTools: Anthropic.Beta.Messages.BetaTool[] = [],
    systemInfo?: string,
    additionalInstructions?: string
  ): string {
    return getSystemContext(additionalTools, systemInfo, additionalInstructions)
  }
}
