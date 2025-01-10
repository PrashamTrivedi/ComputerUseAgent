import { ensureFileSync } from "jsr:@std/fs";
import { log } from "../../config/logging.ts";
import { ToolCall } from "../../types/interfaces.ts";

export class EditorHandlers {
  async handleView(path: string): Promise<Record<string, string>> {
    try {
      const content = await Deno.readTextFile(path);
      return { content };
    } catch (error) {
      log.error(`Error viewing file: ${error}`);
      return { error: `File ${path} does not exist` };
    }
  }

  async handleCreate(
    path: string,
    toolCall: ToolCall["input"],
  ): Promise<Record<string, string>> {
    try {
      ensureFileSync(path);
      await Deno.writeTextFile(path, toolCall.file_text || "");
      return { content: `File created at ${path}` };
    } catch (error) {
      log.error(`Error creating file: ${error}`);
      return { error: String(error) };
    }
  }

  async handleStrReplace(
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
      log.error(`Error replacing string: ${error}`);
      return { error: String(error) };
    }
  }

  async handleInsert(
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
      log.error(`Error inserting content: ${error}`);
      return { error: String(error) };
    }
  }

  async handleTextEditorTool(
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
      log.error(`Error in handleTextEditorTool: ${error}`);
      return { error: String(error) };
    }
  }
}
