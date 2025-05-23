import {Plan, PlanStep} from "../../types/interfaces.ts"
import {Anthropic} from "anthropic"
import {getAPIConfig, PLANNER_SYSTEM_PROMPT} from "../../config/constants.ts"
import {Select, Input, Confirm} from "@cliffy/prompt"
import {PromptDatabase} from "../db/database.ts"
import {blue, green, yellow, bold, dim} from "jsr:@std/fmt/colors"

export default async function generatePlan(
    systemInfo: string,
    tools: Anthropic.Beta.BetaTool[],
    userPrompt: string,
    sessionId?: string
): Promise<Plan> {
    const claude = new Anthropic({
        apiKey: globalThis.Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    })

    const db = new PromptDatabase()
    const promptContent = `<SystemInfo>${systemInfo}</SystemInfo>
            <Tools>${JSON.stringify(tools.map(tool => tool.name))}</Tools>
            <UserRequest>${userPrompt}</UserRequest>`

    console.log(blue("\n🧠 Generating plan..."))

    const apiConfig = getAPIConfig()
    const messageOptions: any = {
        model: apiConfig.REASONING_MODEL,
        max_tokens: apiConfig.MAX_TOKENS_WHEN_THINKING,
        messages: [{
            role: "user",
            content: promptContent,
        }],
        system: PLANNER_SYSTEM_PROMPT,
    }
    
    // Only add thinking if supported by the model
    if (apiConfig.USE_THINKING && apiConfig.MIN_THINKING_TOKENS > 0) {
        messageOptions.thinking = {
            type: "enabled",
            budget_tokens: apiConfig.MIN_THINKING_TOKENS
        }
    }
    
    const response = await claude.messages.create(messageOptions)

    try {
        // Display the thinking process if available
        const thinkingBlock = response.content.find(block => block.type === "thinking")
        if (thinkingBlock && 'thinking' in thinkingBlock) {
            console.log(bold("\n🔍 Planning Thought Process:"))
            console.log("═".repeat(80))

            // Format thinking text with proper indentation and line breaks
            const formattedThinking = thinkingBlock.thinking
                .split('\n')
                .map(line => dim(green(`  ${line}`)))
                .join('\n')

            console.log(formattedThinking)
            console.log("═".repeat(80))
        }

        const textBlock = response.content.find(block => block.type === "text")
        const planJson = textBlock ? JSON.parse(textBlock.text) : {}
        const initialPlan = {planSteps: planJson}

        console.log(yellow("\n✅ Plan generated successfully!"))

        // Log the planner interaction with sessionId
        await db.savePrompt({
            mode: "planner",
            prompt: promptContent,
            result: textBlock?.text || "",
            tokens_used: response.usage?.input_tokens || 0,
            cost: calculateCost(response.usage?.input_tokens || 0, response.usage?.output_tokens || 0, apiConfig.REASONING_MODEL),
            session_id: sessionId
        })

        return await confirmPlan(initialPlan)

    } catch (error) {
        console.error(error)
        throw new Error(`Failed to parse plan: ${error}`)
    }
}

function calculateCost(inputTokens: number, outputTokens: number, modelName: string): number {
    const MODEL_PRICING = {
        "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
        "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 },
        "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
        "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
        "claude-3-5-haiku-20241022": { input: 1.0, output: 5.0 },
    } as const
    
    const pricing = MODEL_PRICING[modelName as keyof typeof MODEL_PRICING]
    if (!pricing) {
        // Fallback to 3.5 Sonnet pricing
        const costPerMillionInputTokens = 3.0
        const costPerMillionOutputTokens = 15.0
        const inputCost = (inputTokens / 1_000_000) * costPerMillionInputTokens
        const outputCost = (outputTokens / 1_000_000) * costPerMillionOutputTokens
        return inputCost + outputCost
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output

    return inputCost + outputCost
}

export async function confirmPlan(plan: Plan): Promise<Plan> {
    console.log("\nProposed Plan Steps:")
    plan.planSteps.forEach((step) => {
        console.log(`${step.step + 1}. ${step.action}`)
    })

    const confirmed = await Confirm.prompt("Do you want to proceed with this plan?")

    if (confirmed) {
        return plan
    }

    const modifiedSteps: PlanStep[] = []
    let currentStep = 0

    while (currentStep < plan.planSteps.length) {
        const step = plan.planSteps[currentStep]
        const action = await Select.prompt({
            message: `Step ${currentStep + 1}: ${step.action}`,
            options: [
                {name: "keep", value: "keep"},
                {name: "modify", value: "modify"},
                {name: "delete", value: "delete"},
                {name: "insert_before", value: "insert"}
            ]
        })

        switch (action) {
            case "keep": {
                modifiedSteps.push(step)
                currentStep++
                break
            }
            case "modify": {
                const modifiedStep = await Input.prompt({
                    message: "Enter modified step:",
                    default: step.action
                })
                modifiedSteps.push({step: currentStep, action: modifiedStep})
                currentStep++
                break
            }
            case "delete": {
                currentStep++
                break
            }
            case "insert": {
                const newStep = await Input.prompt({
                    message: "Enter new step to insert:"
                })
                modifiedSteps.push({step: modifiedSteps.length + 1, action: newStep})
                break
            }
        }
    }

    const addMore = await Confirm.prompt("Do you want to add more steps?")
    while (addMore) {
        const newStep = await Input.prompt({
            message: "Enter new step:"
        })
        modifiedSteps.push({step: modifiedSteps.length + 1, action: newStep})
        if (!(await Confirm.prompt("Add another step?"))) {
            break
        }
    }

    return {planSteps: modifiedSteps}
}