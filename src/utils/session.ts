import Anthropic from "anthropic"
import {format} from "jsr:@std/datetime"
import {crypto} from "jsr:@std/crypto"
import {log} from "../config/logging.ts"
import {PromptDatabase} from "../modules/db/database.ts"
import {getSystemContext} from "../config/constants.ts"

export class SessionLogger {
  private sessionId: string
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private logger: log.Logger

  constructor(sessionId: string) {
    this.sessionId = sessionId
    this.logger = log.getLogger()
  }

  updateTokenUsage(inputTokens: number, outputTokens: number): void {
    this.totalInputTokens += inputTokens
    this.totalOutputTokens += outputTokens
  }

  logTotalCost(): void {
    const costPerMillionInputTokens = 3.0
    const costPerMillionOutputTokens = 15.0

    const totalInputCost = (this.totalInputTokens / 1_000_000) *
      costPerMillionInputTokens
    const totalOutputCost = (this.totalOutputTokens / 1_000_000) *
      costPerMillionOutputTokens
    const totalCost = totalInputCost + totalOutputCost

    this.logger.info(`Session ${this.sessionId} costs:
      Input tokens: ${this.totalInputTokens}
      Output tokens: ${this.totalOutputTokens}
      Input cost: $${totalInputCost.toFixed(6)}
      Output cost: $${totalOutputCost.toFixed(6)}
      Total cost: $${totalCost.toFixed(6)}`)
  }

  getTotalTokens(): number {
    return this.totalInputTokens + this.totalOutputTokens
  }

  getTotalCost(): number {
    const costPerMillionInputTokens = 3.0
    const costPerMillionOutputTokens = 15.0

    const totalInputCost = (this.totalInputTokens / 1_000_000) *
      costPerMillionInputTokens
    const totalOutputCost = (this.totalOutputTokens / 1_000_000) *
      costPerMillionOutputTokens
    return totalInputCost + totalOutputCost
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
    additionalInstructions?: string
  ): string {
    return getSystemContext(additionalTools, additionalInstructions)
  }
}
