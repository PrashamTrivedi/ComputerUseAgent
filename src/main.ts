#!/usr/bin/env -S deno run -A

import {parseArgs} from "jsr:@std/cli/parse-args"
import {ensureDir} from "jsr:@std/fs"
import {format} from "jsr:@std/datetime"
import {crypto} from "jsr:@std/crypto"
import {Anthropic} from "npm:@anthropic-ai/sdk"

import {setupLogging, log} from "./config/logging.ts"
import {EDITOR_DIR, SESSIONS_DIR, API_CONFIG} from "./config/constants.ts"
import {EditorSession} from "./modules/editor/editor_session.ts"
import {BashSession} from "./modules/bash/bash_session.ts"

async function determineIntent(prompt: string): Promise<string> {
  const client = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
  })

  const message = await client.messages.create({
    model: API_CONFIG.INTENT_MODEL,
    max_tokens: API_CONFIG.MAX_INTENT_TOKENS,
    system: `You have following query from user, determine what is the intent of user. 
     and based on user's intent and available tools, pick the best tool that can help user.
     
     <AvailableTools>
     bash
     editor
     </AvailableTools>
     Instruction,
     - Only use the tools mentioned in <AvailableTools> tag.
     - If user's intent is not clear, respond with editor.
     Only respond with the tool name, avoid yapping.`,
    messages: [{
      role: "user",
      content: prompt,
    }],
  })

  return message.content.find((block) => block.type === "text")?.text ?? "editor"

}

async function main() {
  await setupLogging()
  await ensureDir(EDITOR_DIR)
  await ensureDir(SESSIONS_DIR)

  const flags = parseArgs(Deno.args, {
    string: ["mode"],
    boolean: ["no-agi"],
    default: {"no-agi": false},
  })

  const prompt = flags._.join(" ")
  const sessionId = `${format(new Date(), "yyyyMMdd-HHmmss")}-${crypto.randomUUID().slice(0, 6)
    }`

  const intent = await determineIntent(prompt)
  log.debug(`Intent determined: ${intent}`)
  const mode = flags.mode || intent

  if (mode === "editor") {
    const session = new EditorSession(sessionId)
    await session.processEdit(prompt)
  } else if (mode === "bash") {
    const session = new BashSession(sessionId, flags["no-agi"])
    await session.processBashCommand(prompt)
  } else {
    console.error("Invalid mode specified")
    Deno.exit(1)
  }
}

if (import.meta.main) {
  main()
}
