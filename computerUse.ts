#!/usr/bin/env -S deno run -A

// This script provides functionality similar to the Python script for interacting with Anthropic's Claude API
// It supports both text editor and bash command execution modes with comprehensive logging and session management
//
// Required permissions:
// --allow-net: For API calls to Anthropic
// --allow-read: For file operations
// --allow-write: For logging and file editing
// --allow-env: For environment variables
//
// Usage:
// 1. Set ANTHROPIC_API_KEY environment variable
// 2. Run in editor mode: deno run script.ts --mode=editor "your prompt"
// 3. Run in bash mode: deno run script.ts --mode=bash "your command"
// 4. Use --no-agi flag in bash mode to simulate without executing commands

import { Anthropic } from "npm:@anthropic-ai/sdk";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { ensureDir, ensureFileSync } from "jsr:@std/fs";
import { join } from "jsr:@std/path";
import { format } from "jsr:@std/datetime";
import { crypto } from "jsr:@std/crypto";

import * as log from "jsr:@std/log";

// Directory setup
const EDITOR_DIR = join(Deno.cwd(), "editor_dir");
const SESSIONS_DIR = join(Deno.cwd(), "sessions");

const EDITOR_SYSTEM_PROMPT = Deno.env.get("EDITOR_SYSTEM_PROMPT") ??
  "You are a helpful assistant that helps users edit text files.";

// Configure logging
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

class SessionLogger {
  private sessionId: string;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private logger: log.Logger;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.logger = log.getLogger();
  }

  updateTokenUsage(inputTokens: number, outputTokens: number): void {
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
  }

  logTotalCost(): void {
    const costPerMillionInputTokens = 3.0;
    const costPerMillionOutputTokens = 15.0;

    const totalInputCost = (this.totalInputTokens / 1_000_000) *
      costPerMillionInputTokens;
    const totalOutputCost = (this.totalOutputTokens / 1_000_000) *
      costPerMillionOutputTokens;
    const totalCost = totalInputCost + totalOutputCost;

    log.info(`Session ${this.sessionId} costs:
      Input tokens: ${this.totalInputTokens}
      Output tokens: ${this.totalOutputTokens}
      Input cost: $${totalInputCost.toFixed(6)}
      Output cost: $${totalOutputCost.toFixed(6)}
      Total cost: $${totalCost.toFixed(6)}`);
  }
}

interface ToolCall {
  type: string;
  name: string;
  id: string;
  input: {
    command: string;
    path: string;
    file_text?: string;
    old_str?: string;
    new_str?: string;
    insert_line?: number;
  };
}

interface ToolResult {
  tool_call_id: string;
  output: {
    type: string;
    content: Array<{ type: string; text: string }>;
    tool_use_id: string;
    is_error: boolean;
  };
}

class EditorSession {
  private client: Anthropic;
  private sessionId: string;
  private logger: SessionLogger;
  private messages: Array<any> = [];
  private editor_dir: string = EDITOR_DIR;

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? this.createSessionId();
    this.client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    });
    this.logger = new SessionLogger(this.sessionId);
  }

  private createSessionId(): string {
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
    const randomBytes = crypto.getRandomValues(new Uint8Array(3));
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${timestamp}-${randomHex}`;
  }

  async processEdit(prompt: string): Promise<void> {
    try {
      // Initial message with proper content structure
      const message = {
        role: "user",
        content: [{ type: "text", text: prompt }],
      };
      this.messages = [message];

      // Create the system context string
      const systemPrompt = `
      You are a helpful assistant that helps users edit and work text files.
        You have the access of full file system, and you are currently in ${Deno.cwd()} directory.
        Some rules for you to take care of
        - All the paths you provide should be related to current directory.
        - If user asks you to work with current directory or file from current directory, you can use '.' or './' as prefix.`;
      log.info(`User input: ${JSON.stringify(message)}`);

      while (true) {
        const response = await this.client.beta.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: this.messages,
          tools: [
            { type: "text_editor_20241022", name: "str_replace_editor" },
          ],
          system: systemPrompt,
          betas: ["computer-use-2024-10-22"],
        });

        // Extract and log token usage
        const inputTokens = response.usage?.input_tokens ?? 0;
        const outputTokens = response.usage?.output_tokens ?? 0;
        log.info(
          `API usage: input_tokens=${inputTokens}, output_tokens=${outputTokens}`,
        );

        // Update token counts
        this.logger.updateTokenUsage(inputTokens, outputTokens);

        log.info(`API response: ${JSON.stringify(response)}`);

        // Convert response content to message params
        const responseContent = response.content.map((block) =>
          block.type === "text" ? { type: "text", text: block.text } : block
        );

        // Add assistant response to messages
        this.messages.push({ role: "assistant", content: responseContent });

        if (response.stop_reason !== "tool_use") {
          console.log(response.content[0].text);
          break;
        }

        const toolResults = await this.processToolCalls(response.content);

        // Add tool results as user message
        if (toolResults?.length) {
          this.messages.push({
            role: "user",
            content: [toolResults[0].output],
          });

          if (toolResults[0].output.is_error) {
            log.error(
              `Error: ${toolResults[0].output.content}`,
            );
            break;
          }
        }
      }

      this.logger.logTotalCost();
    } catch (error) {
      console.error(error);
      log.error(
        `Error in processEdit: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (error instanceof Error && error.stack) {
        log.error(error.stack);
      }
      throw error;
    }
  }

  private async handleView(path: string): Promise<Record<string, string>> {
    try {
      const content = await Deno.readTextFile(path);
      return { content };
    } catch (error) {
      console.error(error);
      return { error: `File ${path} does not exist` };
    }
  }

  private async handleCreate(
    path: string,
    toolCall: ToolCall["input"],
  ): Promise<Record<string, string>> {
    try {
      ensureFileSync(path);
      await Deno.writeTextFile(path, toolCall.file_text || "");
      return { content: `File created at ${path}` };
    } catch (error) {
      console.error(error);
      return { error: String(error) };
    }
  }

  private async handleStrReplace(
    path: string,
    toolCall: ToolCall["input"],
  ): Promise<Record<string, string>> {
    try {
      const content = await Deno.readTextFile(path);
      if (!toolCall.old_str || !content.includes(toolCall.old_str)) {
        return { error: "old_str not found in file" };
      }
      const newContent = content.replace(
        toolCall.old_str,
        toolCall.new_str || "",
      );
      await Deno.writeTextFile(path, newContent);
      return { content: "File updated successfully" };
    } catch (error) {
      console.error(error);
      return { error: String(error) };
    }
  }

  private async handleInsert(
    path: string,
    toolCall: ToolCall["input"],
  ): Promise<Record<string, string>> {
    try {
      const content = await Deno.readTextFile(path);
      const lines = content.split("\n");
      if (!toolCall.insert_line || toolCall.insert_line > lines.length) {
        return { error: "insert_line beyond file length" };
      }
      lines.splice(toolCall.insert_line, 0, toolCall.new_str || "");
      await Deno.writeTextFile(path, lines.join("\n"));
      return { content: "Content inserted successfully" };
    } catch (error) {
      console.error(error);
      return { error: String(error) };
    }
  }

  private async handleTextEditorTool(
    toolCall: ToolCall["input"],
  ): Promise<Record<string, string>> {
    try {
      if (!toolCall.command || !toolCall.path) {
        return { error: "Missing required fields" };
      }

      const handlers: Record<
        string,
        (
          path: string,
          toolCall: ToolCall["input"],
        ) => Promise<Record<string, string>>
      > = {
        view: (path) => this.handleView(path),
        create: (path, input) => this.handleCreate(path, input),
        str_replace: (path, input) => this.handleStrReplace(path, input),
        insert: (path, input) => this.handleInsert(path, input),
      };

      const handler = handlers[toolCall.command];
      if (!handler) {
        return { error: `Unknown command ${toolCall.command}` };
      }

      return await handler(toolCall.path, toolCall);
    } catch (error) {
      console.error(error);
      log.error(`Error in handleTextEditorTool: ${error}`);
      return { error: String(error) };
    }
  }

  private async processToolCalls(content: any[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of content) {
      if (
        toolCall.type === "tool_use" && toolCall.name === "str_replace_editor"
      ) {
        // Log the tool call inputs
        for (const [key, value] of Object.entries(toolCall.input)) {
          const truncatedValue = String(value).slice(0, 20) +
            (String(value).length > 20 ? "..." : "");
          log.info(
            `Tool call key: ${key}, Value (truncated): ${truncatedValue}`,
          );
        }

        const result = await this.handleTextEditorTool(toolCall.input);
        const isError = "error" in result;
        const toolResultContent = isError
          ? [{ type: "text", text: result.error }]
          : [{ type: "text", text: result.content || "" }];

        results.push({
          tool_call_id: toolCall.id,
          output: {
            type: "tool_result",
            content: toolResultContent,
            tool_use_id: toolCall.id,
            is_error: isError,
          },
        });
      }
    }

    return results;
  }
}

class BashSession {
  private client: Anthropic;
  private sessionId: string;
  private logger: SessionLogger;
  private messages: Array<any> = [];
  private noAgi: boolean;
  private environment: Record<string, string>;

  constructor(sessionId?: string, noAgi = false) {
    this.sessionId = sessionId ?? this.createSessionId();
    this.client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    });
    this.logger = new SessionLogger(this.sessionId);
    this.noAgi = noAgi;
    this.environment = { ...Deno.env.toObject() };
  }

  private createSessionId(): string {
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
    const randomBytes = crypto.getRandomValues(new Uint8Array(3));
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${timestamp}-${randomHex}`;
  }

  private async handleBashCommand(
    toolCall: Record<string, any>,
  ): Promise<Record<string, any>> {
    try {
      const command = toolCall.command;
      const restart = toolCall.restart ?? false;

      if (restart) {
        this.environment = { ...Deno.env.toObject() }; // Reset the environment
        log.info("Bash session restarted.");
        return { content: "Bash session restarted." };
      }

      if (!command) {
        log.error("No command provided to execute.");
        return { error: "No command provided to execute." };
      }

      if (this.noAgi) {
        log.info(`Mock executing bash command: ${command}`);
        return { content: "in mock mode, command did not run" };
      }

      log.info(`Executing bash command: ${command}`);

      const process = new Deno.Command("bash", {
        args: ["-c", command],
        env: this.environment,
        stdout: "piped",
        stderr: "piped",
      });

      const { stdout, stderr, code } = await process.output();

      const output = new TextDecoder().decode(stdout).trim();
      const errorOutput = new TextDecoder().decode(stderr).trim();

      if (output) {
        log.info(
          `Command output:\n\n\`\`\`output for '${
            command.slice(0, 20)
          }...'\n${output}\n\`\`\``,
        );
      }
      if (errorOutput) {
        log.error(
          `Command error output:\n\n\`\`\`error for '${command}'\n${errorOutput}\n\`\`\``,
        );
      }

      if (code !== 0) {
        const errorMessage = errorOutput || "Command execution failed.";
        return { error: errorMessage };
      }

      return { content: output };
    } catch (error) {
      log.error(`Error in handleBashCommand: ${error}`);
      console.error(error);
      return { error: String(error) };
    }
  }

  private async processToolCalls(content: any[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of content) {
      if (toolCall.type === "tool_use" && toolCall.name === "bash") {
        log.info(`Bash tool call input: ${JSON.stringify(toolCall.input)}`);

        const result = await this.handleBashCommand(toolCall.input);

        // Convert result to match expected tool result format
        const isError = "error" in result;
        const toolResultContent = isError
          ? [{ type: "text", text: result.error }]
          : [{ type: "text", text: result.content || "" }];

        results.push({
          tool_call_id: toolCall.id,
          output: {
            type: "tool_result",
            content: toolResultContent,
            tool_use_id: toolCall.id,
            is_error: isError,
          },
        });
      }
    }

    return results;
  }

  async processBashCommand(bashPrompt: string): Promise<void> {
    try {
      // Get system information
      const systemInfo = {
        os: Deno.build.os,
        arch: Deno.build.arch,
        isWsl: Deno.env.get("WSL_DISTRO_NAME") !== undefined,
        shell: Deno.env.get("SHELL") || "Unknown",
      };

      // Create the system context string
      const systemContext = `
      You are a helpful assistant that can execute shell command.
      You operate in the environment mentioned in <SystemInfo> tag.
      <SystemInfo>
      System Context:
- Operating System: ${systemInfo.os}
- Architecture: ${systemInfo.arch}
- Shell: ${systemInfo.shell}
- WSL: ${systemInfo.isWsl ? "Yes" : "No"}
- Current Directory: ${Deno.cwd()}
</SystemInfo>

Please ensure all commands are compatible with this environment.
`;

      // Initial message with proper content structure
      const apiMessage = {
        role: "user",
        content: [{ type: "text", text: bashPrompt }],
      };
      this.messages = [apiMessage];

      log.info(`User input: ${JSON.stringify(apiMessage)}`);

      while (true) {
        const response = await this.client.beta.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: this.messages,
          tools: [{ type: "bash_20241022", name: "bash" }],
          system: systemContext,
          betas: ["computer-use-2024-10-22"],
        });

        // Extract token usage
        const inputTokens = response.usage?.input_tokens ?? 0;
        const outputTokens = response.usage?.output_tokens ?? 0;
        log.info(
          `API usage: input_tokens=${inputTokens}, output_tokens=${outputTokens}`,
        );

        // Update token counts
        this.logger.updateTokenUsage(inputTokens, outputTokens);

        log.info(`API response: ${JSON.stringify(response)}`);

        // Convert response content to message params
        const responseContent = response.content.map((block) =>
          block.type === "text" ? { type: "text", text: block.text } : block
        );

        // Add assistant response to messages
        this.messages.push({ role: "assistant", content: responseContent });

        if (response.stop_reason !== "tool_use") {
          // Print the assistant's final response
          console.log(response.content[0].text);
          break;
        }

        const toolResults = await this.processToolCalls(response.content);

        // Add tool results as user message
        if (toolResults.length) {
          this.messages.push({
            role: "user",
            content: [toolResults[0].output],
          });

          if (toolResults[0].output.is_error) {
            log.error(
              `Error: ${toolResults[0].output.content[0].text}`,
            );
            break;
          }
        }
      }

      // After the execution loop, log the total cost
      this.logger.logTotalCost();
    } catch (error) {
      log.error(`Error in processBashCommand: ${error}`);
      console.error(error);
      throw error;
    }
  }
}

async function main() {
  await ensureDir(EDITOR_DIR);
  await ensureDir(SESSIONS_DIR);

  const flags = parseArgs(Deno.args, {
    string: ["mode"],
    boolean: ["no-agi"],

    default: { "no-agi": false },
  });

  const prompt = flags._.join(" ");
  const sessionId = `${format(new Date(), "yyyyMMdd-HHmmss")}-${
    crypto.randomUUID().slice(0, 6)
  }`;

  const intent = await determineIntent(prompt);

  log.info({ intent, mode: flags.mode });
  const mode = flags.mode || intent;
  if (mode === "editor") {
    const session = new EditorSession(sessionId);
    await session.processEdit(prompt);
  } else if (mode === "bash") {
    const session = new BashSession(sessionId, flags["no-agi"]);
    await session.processBashCommand(prompt);
  } else {
    console.error("Invalid mode specified");
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}

async function determineIntent(prompt: string) {
  const client = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
  });
  const message = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 10,
    system:
      `You have following query from user, determine what is the intent of user. 
     and based on user's intent and available tools, pick the best tool that can help user.
     
     <AvailableTools>
     bash
     editor
     </AvailableTools>
     Instruction,
     - Only use the tools mentioned in <AvailableTools> tag.
     - If user's intent is not clear, respond with editor.
     Only respond with the tool name, avoid yapping.`,
    messages: [{
      role: "user",
      content: prompt,
    }],
  });

  return message.content[0].text;
}
