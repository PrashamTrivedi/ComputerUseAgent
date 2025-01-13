import * as log from "jsr:@std/log"
import {LOGS_DIR} from "./constants.ts"

export async function setupLogging() {
  await log.setup({
    handlers: {
      console: new log.ConsoleHandler("DEBUG"),
      file: new log.FileHandler("DEBUG", {
        filename: `${LOGS_DIR}/log.txt`,
      }),
    },
    loggers: {
      default: {
        level: "DEBUG",
        handlers: ["console", "file"],
      },
    },
  })
}

export {log}
