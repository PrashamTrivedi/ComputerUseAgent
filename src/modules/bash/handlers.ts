import {log} from "../../config/logging.ts"

export class BashHandlers {
    private noAgi: boolean
    private environment: Record<string, string>

    constructor(noAgi = false) {
        this.noAgi = noAgi
        this.environment = {...Deno.env.toObject()}
    }

    async handleBashCommand(
        toolCall: Record<string, any>,
    ): Promise<Record<string, any>> {
        try {
            const command = toolCall.command as string
            const restart = toolCall.restart ?? false

            if (restart) {
                this.environment = {...Deno.env.toObject()}
                log.info("Bash session restarted.")
                return {content: "Bash session restarted."}
            }

            if (!command) {
                log.error("No command provided to execute.")
                return {error: "No command provided to execute."}
            }

            if (this.noAgi) {
                log.info(`Mock executing bash command: ${command}`)
                return {content: "in mock mode, command did not run"}
            }

            log.info(`Executing bash command: ${command}`)

            const shell = Deno.env.get("SHELL") || "bash"
            const process = new Deno.Command(shell, {
                args: ["-c", command],
                env: this.environment,
                stdout: "piped",
                stderr: "piped",
            })
            const {stdout, stderr, code} = await process.output()

            const output = new TextDecoder().decode(stdout).trim()
            const errorOutput = new TextDecoder().decode(stderr).trim()

            if (code === 0) {
                if (output) {
                    log.info(
                        `Command output:\n\n\`\`\`output for '${command.slice(0, 20)
                        }...'\n${output}\n\`\`\``,
                    )
                }
            } else if (errorOutput) {
                log.error(
                    `Command error output:\n\n\`\`\`error for '${command}'\n${errorOutput}\n\`\`\``,
                )
            }

            if (code !== 0) {
                const errorMessage = errorOutput || "Command execution failed."
                return {error: errorMessage}
            }

            return {content: output}
        } catch (error) {
            log.error(`Error in handleBashCommand: ${error}`)
            return {error: String(error)}
        }
    }
}
