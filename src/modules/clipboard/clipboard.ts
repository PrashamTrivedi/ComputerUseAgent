import {log} from "../../config/logging.ts"

export class ClipboardManager {
    private async readLinux(): Promise<string> {
        try {
            // Try xclip first
            try {
                const command = new Deno.Command("xclip", {
                    args: ["-o", "-selection", "clipboard"],
                })
                const output = await command.output()
                return new TextDecoder().decode(output.stdout).trim()
            } catch {
                // Fallback to xsel
                const command = new Deno.Command("xsel", {
                    args: ["--clipboard", "--output"],
                })
                const output = await command.output()
                return new TextDecoder().decode(output.stdout).trim()
            }
        } catch (error) {
            throw new Error("Clipboard access requires xclip or xsel to be installed")
        }
    }

    private async readMac(): Promise<string> {
        const command = new Deno.Command("pbpaste")
        const output = await command.output()
        return new TextDecoder().decode(output.stdout).trim()
    }

    private async readWindows(): Promise<string> {
        const command = new Deno.Command("powershell.exe", {
            args: ["-Command", "Get-Clipboard"],
        })
        const output = await command.output()
        return new TextDecoder().decode(output.stdout).trim()
    }

    async readClipboard(): Promise<string> {
        try {
            const os = Deno.build.os
            const isWsl = Deno.env.get("WSL_DISTRO_NAME") !== undefined

            if (isWsl || os === "windows") {
                return await this.readWindows()
            } else if (os === "darwin") {
                return await this.readMac()
            } else if (os === "linux") {
                return await this.readLinux()
            } else {
                throw new Error(`Unsupported platform: ${os}`)
            }
        } catch (error) {
            log.error(`Error reading clipboard: ${error}`)
            throw new Error(`Failed to read clipboard: ${error}`)
        }
    }
}
