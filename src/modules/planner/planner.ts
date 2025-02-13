import {Plan, PlanStep} from "../../types/interfaces.ts"
import {Anthropic} from "anthropic"
import {API_CONFIG, PLANNER_SYSTEM_PROMPT} from "../../config/constants.ts"
import {Select, Input, Confirm} from "@cliffy/prompt"
import {PromptDatabase} from "../db/database.ts"

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

    const response = await claude.messages.create({
        model: API_CONFIG.MODEL,
        max_tokens: API_CONFIG.MAX_TOKENS,
        messages: [{
            role: "user",
            content: promptContent,
        }],
        system: PLANNER_SYSTEM_PROMPT,
    })

    try {
        const textBlock = response.content.find(block => block.type === "text")
        const planJson = textBlock ? JSON.parse(textBlock.text) : {}
        const initialPlan = {planSteps: planJson}

        // Log the planner interaction with sessionId
        await db.savePrompt({
            mode: "planner",
            prompt: promptContent,
            result: textBlock?.text || "",
            tokens_used: response.usage?.input_tokens || 0,
            cost: calculateCost(response.usage?.input_tokens || 0, response.usage?.output_tokens || 0),
            session_id: sessionId
        })

        return await confirmPlan(initialPlan)

    } catch (error) {
        console.error(error)
        throw new Error(`Failed to parse plan: ${error}`)
    }
}

function calculateCost(inputTokens: number, outputTokens: number): number {
    const costPerMillionInputTokens = 3.0
    const costPerMillionOutputTokens = 15.0

    const inputCost = (inputTokens / 1_000_000) * costPerMillionInputTokens
    const outputCost = (outputTokens / 1_000_000) * costPerMillionOutputTokens

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