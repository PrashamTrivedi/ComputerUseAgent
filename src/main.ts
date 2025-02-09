#!/usr/bin/env -S deno run -A

import {parseArgs} from "jsr:@std/cli/parse-args"
import {ensureDir} from "jsr:@std/fs"
import {format} from "jsr:@std/datetime"
import {crypto} from "jsr:@std/crypto"

import {setupLogging, log} from "./config/logging.ts"
import {EDITOR_DIR, SESSIONS_DIR, DEFAULT_TOOLS_CONFIG_PATH, MEMORY_PATH} from "./config/constants.ts"
import {EditorSession} from "./modules/editor/editor_session.ts"
import {BashSession} from "./modules/bash/bash_session.ts"
import {HybridSession} from "./modules/hybrid/hybrid_session.ts"
import {parseFlagForHelp} from "./utils/functions.ts"
import {handleHistory} from "./commands/history.ts"
import {handleSettings} from "./commands/settings.ts"
import {loadUserSettings} from "./config/settings.ts"
import {openInEditor} from "./commands/editor.ts"

async function main() {
  await setupLogging()
  await ensureDir(EDITOR_DIR)
  await ensureDir(SESSIONS_DIR)

  const argParseConfig = {
    string: ["mode"],
    boolean: ["no-agi"],
    default: {"no-agi": false},
  }
  const flags = parseArgs(Deno.args, argParseConfig)

  const prompt = flags._.join(" ")
  const sessionId = `${format(new Date(), "yyyyMMdd-HHmmss")}-${crypto.randomUUID().slice(0, 6)}`

  const mode = flags.mode

  if (flags._[0] === "history") {
    await handleHistory(Deno.args)
    return
  } else if (flags._[0] === "settings") {
    await handleSettings(Deno.args)
    return
  } else if (flags._[0] === "help") {
    console.log(parseFlagForHelp(argParseConfig))
    return
  } else if (flags._[0] === "edit") {
    const settings = loadUserSettings()
    switch (flags._[1]) {
      case "tools":
        log.info(`Opening tools config file: ${settings.toolConfigPath}`)
        await openInEditor(settings.toolConfigPath || DEFAULT_TOOLS_CONFIG_PATH)
        return
      case "memory":
        log.info(`Opening memory file: ${MEMORY_PATH}`)
        await openInEditor(MEMORY_PATH)
        return
      default:
        console.log("Usage: edit [tools|memory]")
    }
    return
  }

  if (mode === "editor") {
    const session = new EditorSession(sessionId)
    await session.processEdit(prompt)
  } else if (mode === "bash") {
    const session = new BashSession(sessionId, flags["no-agi"])
    await session.processBashCommand(prompt)
  } else {
    const session = new HybridSession(sessionId, flags["no-agi"])
    await session.process(prompt)
  }
}

if (import.meta.main) {
  main()
}
