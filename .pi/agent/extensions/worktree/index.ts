import { basename, dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { moveSessionTo } from "../cwd-and-fish/index.ts";

export default function (pi: ExtensionAPI) {
    pi.registerCommand("worktree", {
        description: "Create a git worktree, move the session into it, and run an optional prompt there",
        handler: async (args, ctx) => {
            await ctx.waitForIdle();

            const toplevel = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd: ctx.cwd });
            if (toplevel.code !== 0) throw new Error(`Not in a git repository: ${ctx.cwd}`);

            // 2026-10-02T14:30:05.123Z -> 20261002-143005
            const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
            const root = toplevel.stdout.trim();
            const branch = `pi-${stamp}`;
            const target = join(dirname(root), `${basename(root)}-${branch}`);
            const added = await pi.exec("git", ["worktree", "add", "-b", branch, target], { cwd: root });
            if (added.code !== 0) throw new Error(added.stderr.trim());

            const prompt = args.trim();

            await moveSessionTo(ctx, target, async (newCtx) => {
                newCtx.ui.notify(`Switched to worktree ${target} (branch ${branch})`, "info");
                if (prompt) await newCtx.sendUserMessage(prompt);
            });
        },
    });
}
