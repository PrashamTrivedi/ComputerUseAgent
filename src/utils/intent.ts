import { Anthropic } from "npm:@anthropic-ai/sdk";
import { API_CONFIG } from "../config/constants.ts";

export async function determineIntent(prompt: string): Promise<string> {
    const client = new Anthropic({
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    });

    const message = await client.messages.create({
        model: API_CONFIG.INTENT_MODEL,
        max_tokens: API_CONFIG.MAX_INTENT_TOKENS,
        system: `You have following query from user. Analyze and select the most appropriate tool based on the following criteria:

     
     <AvailableTools>
     bash:
      - Command line operations including git commands
      - File system operations
      - Process management
      - Pipeline operations
      - Shell scripting tasks
     editor:
      - Text file creation and modification
      - Code editing
      - Configuration file updates
      - Documentation writing
      - Multi-file text search and replace
     </AvailableTools>
     Instruction,
     - Only use the tools mentioned in <AvailableTools> tag.
     - For compound tasks:
        - Identify the most primary opearation and select the tool based on that.
     - If user's intent is not clear.
        - Analyse if the task has any command line aspects
        - If yes, select bash
        - If purely text editing, select editor
        - If still ambiguous, select bash
     Only respond with the tool name, avoid yapping.`,
        messages: [{
            role: "user",
            content: prompt,
        }],
    });

    return message.content.find((block) => block.type === "text")?.text ?? "editor";
}
