import {BaseSession} from "../../utils/session.ts"
import {BASH_SYSTEM_PROMPT, API_CONFIG, MEMORY_TOOLS} from "../../config/constants.ts"
import {ToolResult} from "../../types/interfaces.ts"
import {log} from "../../config/logging.ts"
import {BashHandlers} from "./handlers.ts"
import {MemoryManager} from "../memory/memory_manager.ts"

export class BashSession extends BaseSession {
    private noAgi: boolean
    private environment: Record<string, string>
    private memoryManager: MemoryManager

    private handlers: BashHandlers

    constructor(sessionId?: string, noAgi = false) {
        super(sessionId)
        this.noAgi = noAgi
        this.environment = {...Deno.env.toObject()}
        this.handlers = new BashHandlers(noAgi)
        this.memoryManager = new MemoryManager()
    }

    async processBashCommand(bashPrompt: string): Promise<void> {
        try {
            const systemInfo = {
                os: Deno.build.os,
                arch: Deno.build.arch,
                isWsl: Deno.env.get("WSL_DISTRO_NAME") !== undefined,
                shell: Deno.env.get("SHELL") || "Unknown",
            }

            const systemContext = `${BASH_SYSTEM_PROMPT}
<SystemInfo>
System Context:
- Operating System: ${systemInfo.os}
- Architecture: ${systemInfo.arch}
- Shell: ${systemInfo.shell}
- WSL: ${systemInfo.isWsl ? "Yes" : "No"}
- Current Directory: ${Deno.cwd()}
</SystemInfo>`

            const apiMessage = {
                role: "user",
                content: [{type: "text", text: bashPrompt}],
            }
            this.messages = [apiMessage]

            log.info(`User input: ${JSON.stringify(apiMessage)}`)

            while (true) {
                const response = await this.client.beta.messages.create({
                    model: API_CONFIG.MODEL,
                    max_tokens: API_CONFIG.MAX_TOKENS,
                    messages: this.messages,
                    tools: [{type: "bash_20241022", name: "bash"}
                        , ...MEMORY_TOOLS
                    ],
                    system: systemContext,
                    betas: ["computer-use-2024-10-22"],
                })

                const inputTokens = response.usage?.input_tokens ?? 0
                const outputTokens = response.usage?.output_tokens ?? 0
                this.logger.updateTokenUsage(inputTokens, outputTokens)

                const responseContent = response.content.map((block) =>
                    block.type === "text" ? {type: "text", text: block.text} : block
                )

                this.messages.push({role: "assistant", content: responseContent})

                if (response.stop_reason !== "tool_use") {
                    console.log(response.content.find((block) => block.type === "text")?.text ?? "bash")
                    break
                }

                const toolResults = await this.processToolCalls(response.content)

                if (toolResults.length) {
                    this.messages.push({
                        role: "user",
                        content: [toolResults[0].output],
                    })

                    if (toolResults[0].output.is_error) {
                        log.error(`Error: ${toolResults[0].output.content[0].text}`)
                        break
                    }
                }
            }

            this.logger.logTotalCost()
        } catch (error) {
            log.error(`Error in processBashCommand: ${error}`)
            throw error
        }
    }

    private async processToolCalls(content: any[]): Promise<ToolResult[]> {
        const results: ToolResult[] = []

        for (const toolCall of content) {
            if (toolCall.type === "tool_use") {
                let result
                let isError = false

                switch (toolCall.name) {
                    case "bash": {

                        log.info(`Bash tool call input: ${JSON.stringify(toolCall.input)}`)
                        result = await this.handlers.handleBashCommand(toolCall.input)
                        isError = "error" in result
                        const toolResultContent = isError
                            ? [{type: "text", text: result.error}]
                            : [{type: "text", text: result.content || "Command executed successfully."}]

                        results.push({
                            tool_call_id: toolCall.id,
                            output: {
                                type: "tool_result",
                                content: toolResultContent,
                                tool_use_id: toolCall.id,
                                is_error: isError,
                            },
                        })
                        break
                    }
                    case "add_memory":
                        result = await this.memoryManager.addMemory(toolCall.input.content)
                        results.push({
                            tool_call_id: toolCall.id,
                            output: {
                                type: "tool_result",
                                content: [{type: "text", text: result.content}],
                                tool_use_id: toolCall.id,
                                is_error: false,
                            },
                        })
                        break
                    case "get_memories":
                        result = await this.memoryManager.getMemories()
                        results.push({
                            tool_call_id: toolCall.id,
                            output: {
                                type: "tool_result",
                                content: [{type: "text", text: JSON.stringify(result)}],
                                tool_use_id: toolCall.id,
                                is_error: false,
                            },
                        })
                        break
                    case "clear_memories":
                        await this.memoryManager.clearMemories()
                        result = {message: "Memories cleared successfully"}
                        results.push({
                            tool_call_id: toolCall.id,
                            output: {
                                type: "tool_result",
                                content: [{type: "text", text: JSON.stringify(result)}],
                                tool_use_id: toolCall.id,
                                is_error: false,
                            },
                        })
                        break
                }
            }
        }

        return results
    }
}
