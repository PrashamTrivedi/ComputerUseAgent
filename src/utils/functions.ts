import {ParseOptions} from "jsr:@std/cli/parse-args"
import {log} from "../config/logging.ts"

export function parseFlagForHelp(options: ParseOptions): string {
    const helpSections: string[] = []

    // Add usage section
    helpSections.push(
        "Usage:",
        "  ComputerUseAgent [options] <command> [arguments]",
        "",
        "Commands:",
        "  history    Show command history",
        "  settings   Manage settings",
        "  help       Show this help message",
        "",
        "Options:"
    )

    // Handle boolean flags
    if (options.boolean) {
        const booleans = Array.isArray(options.boolean) ? options.boolean : [options.boolean]
        if (booleans.length > 0 && typeof booleans[0] !== 'boolean') {
            helpSections.push(...booleans.map((flag: string) =>
                `  --${flag}${' '.repeat(20 - flag.length)}Enable ${flag} flag${options.default?.[flag] !== undefined ? `, (Default: ${options.default[flag]})` : ''}`
            ))
        }
    }

    // Handle string flags
    if (options.string) {
        const strings = Array.isArray(options.string) ? options.string : [options.string]
        if (strings.length > 0) {
            helpSections.push(...strings.map((flag: string) =>
                `  --${flag}=<value>${' '.repeat(16 - flag.length)}Set ${flag} value${options.default?.[flag] ? `, (Default: ${options.default[flag]})` : ''}`
            ))
        }
    }

    // Handle collectable flags
    if (options.collect) {
        const collectables = Array.isArray(options.collect) ? options.collect : [options.collect]
        if (collectables.length > 0) {
            helpSections.push(
                "",
                "Repeatable options:",
                ...collectables.map((flag: string) =>
                    `  --${flag}=<value>${' '.repeat(16 - flag.length)}Add ${flag} value (can be used multiple times)`
                )
            )
        }
    }

    // Handle negatable flags
    if (options.negatable) {
        const negatables = Array.isArray(options.negatable) ? options.negatable : [options.negatable]
        if (negatables.length > 0) {
            helpSections.push(
                "",
                "Toggleable options:",
                ...negatables.map((flag: string) =>
                    `  --[no-]${flag}${' '.repeat(17 - flag.length)}Enable/disable ${flag}`
                )
            )
        }
    }



    log.debug({sections: helpSections.length})
    return helpSections.join('\n')
}