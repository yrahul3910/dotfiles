import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";

const PROMPT = "❯ ";

class UnicodePromptEditor extends CustomEditor {
    render(width: number): string[] {
        const innerWidth = Math.max(1, width - PROMPT.length);
        const lines = super.render(innerWidth);

        return lines.map((line, index) => {
            const prefix = index === 1 ? PROMPT : "";
            return prefix + line;
        });
    }
}

export default function (pi: ExtensionAPI) {
    pi.on("session_start", (_event, ctx) => {
        ctx.ui.setEditorComponent((tui, theme, keybindings) => {
            return new UnicodePromptEditor(tui, theme, keybindings);
        });
    });
}

