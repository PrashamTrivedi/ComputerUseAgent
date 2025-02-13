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
        log.info(`I am running command: ${toolCall.command}`)
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


            const shell = Deno.env.get("SHELL") || "bash"
            log.info(`Executing command: ${command}`)

            try {
                // First attempt: Try running the command with bash -c
                const directProcess = new Deno.Command("bash", {
                    args: ["-c", command],
                    env: this.environment,
                    stdout: "piped",
                    stderr: "piped",
                })
                const result = await directProcess.output()

                const output = new TextDecoder().decode(result.stdout).trim()
                if (result.code === 0) {
                    if (output) {
                        log.info(`Command output:\n\n\`\`\`output for '${command.slice(0, 20)}...'\n${output}\n\`\`\``)
                    }
                    return {content: output}
                } else {
                    const errorMessage = new TextDecoder().decode(result.stderr).trim()
                    log.error({errorMessage})
                    throw new Error(errorMessage)
                }
            } catch (error) {
                log.info(`Direct execution failed, trying with shell: ${shell} -c ${command}`)

                try {
                    // Second attempt: Try with shell -c
                    const shellProcess = new Deno.Command(shell, {
                        args: ["-c", command],
                        env: this.environment,
                        stdout: "piped",
                        stderr: "piped",
                    })
                    const {stdout, stderr, code} = await shellProcess.output()

                    const output = new TextDecoder().decode(stdout).trim()
                    const errorOutput = new TextDecoder().decode(stderr).trim()

                    if (code === 0) {
                        if (output) {
                            log.info(`Command output:\n\n\`\`\`output for '${command.slice(0, 20)}...'\n${output}\n\`\`\``)
                        }
                        return {content: output}
                    } else {
                        log.error(`Command error output:\n\n\`\`\`error for '${command}'\n${errorOutput}\n\`\`\``)
                        return {error: errorOutput || "Command execution failed."}
                    }
                } catch (finalError) {
                    return {error: String(finalError)}
                }
            }
        } catch (error) {
            log.error(`Error in handleBashCommand: ${error}`)
            return {error: String(error)}
        }
    }
}
