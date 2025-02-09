import { loadUserSettings } from "../config/settings.ts";
import { log } from "../config/logging.ts";
import { DEFAULT_EDITOR } from "../config/constants.ts";

export async function openInEditor(filePath: string): Promise<void> {
  const settings = await loadUserSettings();
  const editorCmd = settings.editorCommand || DEFAULT_EDITOR;
  
  try {
    const process = new Deno.Command(editorCmd, {
      args: [filePath],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit"
    });
    
    await process.output();
  } catch (error) {
    log.error(`Failed to open editor: ${error}`);
  }
}
