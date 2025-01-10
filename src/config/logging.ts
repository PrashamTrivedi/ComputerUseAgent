import * as log from "jsr:@std/log";

export async function setupLogging() {
  await log.setup({
    handlers: {
      console: new log.ConsoleHandler("DEBUG"),
      file: new log.FileHandler("DEBUG", {
        filename: "./app.log",
      }),
    },
    loggers: {
      default: {
        level: "DEBUG",
        handlers: ["console", "file"],
      },
    },
  });
}

export { log };
