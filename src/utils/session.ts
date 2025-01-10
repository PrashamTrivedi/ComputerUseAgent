import { Anthropic } from "npm:@anthropic-ai/sdk";
import { format } from "jsr:@std/datetime";
import { crypto } from "jsr:@std/crypto";
import { log } from "../config/logging.ts";

export class SessionLogger {
  private sessionId: string;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private logger: log.Logger;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.logger = log.getLogger();
  }

  updateTokenUsage(inputTokens: number, outputTokens: number): void {
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
  }

  logTotalCost(): void {
    const costPerMillionInputTokens = 3.0;
    const costPerMillionOutputTokens = 15.0;

    const totalInputCost = (this.totalInputTokens / 1_000_000) *
      costPerMillionInputTokens;
    const totalOutputCost = (this.totalOutputTokens / 1_000_000) *
      costPerMillionOutputTokens;
    const totalCost = totalInputCost + totalOutputCost;

    this.logger.info(`Session ${this.sessionId} costs:
      Input tokens: ${this.totalInputTokens}
      Output tokens: ${this.totalOutputTokens}
      Input cost: $${totalInputCost.toFixed(6)}
      Output cost: $${totalOutputCost.toFixed(6)}
      Total cost: $${totalCost.toFixed(6)}`);
  }
}

export class BaseSession {
  protected client: Anthropic;
  protected sessionId: string;
  protected logger: SessionLogger;
  protected messages: Array<any> = [];

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? this.createSessionId();
    this.client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    });
    this.logger = new SessionLogger(this.sessionId);
  }

  protected createSessionId(): string {
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
    const randomBytes = crypto.getRandomValues(new Uint8Array(3));
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${timestamp}-${randomHex}`;
  }
}
