import {Plan, SystemInfo} from "../../types/interfaces.ts"
import {Anthropic} from "anthropic"
import {API_CONFIG, PLANNER_SYSTEM_PROMPT} from "../../config/constants.ts"

export default async function generatePlan(
    systemInfo: string,
    tools: Anthropic.Beta.BetaTool[],
    userPrompt: string
): Promise<Plan> {
    const claude = new Anthropic({
        apiKey: globalThis.Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    })

    const response = await claude.messages.create({
        model: API_CONFIG.MODEL,
        max_tokens: API_CONFIG.MAX_TOKENS,
        messages: [{
            role: "user",
            content: `<SystemInfo>${systemInfo}</SystemInfo>
            <Tools>${JSON.stringify(tools)}</Tools>
            <UserRequest>${userPrompt}</UserRequest>.`,
        }],
        system: PLANNER_SYSTEM_PROMPT,
    })

    try {

        const textBlock = response.content.find(block => block.type === "text")
        const planJson = textBlock ? JSON.parse(textBlock.text) : {}
        return {planSteps: planJson}
    } catch (error) {
        throw new Error(`Failed to parse plan: ${error}`)
    }
}