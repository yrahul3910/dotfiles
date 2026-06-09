import { constants, existsSync, readdirSync } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { ExtensionAPI, BashOperations } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "process-cwd";
let previousCwd: string | undefined;
let cachedFishPath: string | null | undefined;

function resolveFishPath(): string | null {
    if (cachedFishPath !== undefined) return cachedFishPath;

    const candidates = [
        process.env.PI_FISH_PATH,
        process.env.SHELL?.endsWith("/fish") ? process.env.SHELL : undefined,
        "/opt/homebrew/bin/fish",
        "/usr/local/bin/fish",
        "/opt/local/bin/fish",
        "/usr/bin/fish",
    ].filter((path): path is string => Boolean(path));

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            cachedFishPath = candidate;
            return cachedFishPath;
        }
    }

    const which = spawnSync("which", ["fish"], { encoding: "utf8", timeout: 2_000 });
    const found = which.status === 0 ? which.stdout.trim().split(/\r?\n/)[0] : undefined;
    cachedFishPath = found && existsSync(found) ? found : null;
    return cachedFishPath;
}

function createFishOperations(): BashOperations {
    return {
        async exec(command, cwd, { onData, signal, timeout, env }) {
            const fish = resolveFishPath();
            if (!fish) throw new Error("Could not find fish. Set PI_FISH_PATH to your fish binary.");

            await access(cwd, constants.F_OK);
            if (signal?.aborted) throw new Error("aborted");

            const child = spawn(fish, ["-ic", command], {
                cwd,
                detached: process.platform !== "win32",
                env: { ...process.env, ...env, PWD: cwd },
                stdio: ["ignore", "pipe", "pipe"],
                windowsHide: true,
            });

            let timedOut = false;
            let timeoutHandle: NodeJS.Timeout | undefined;
            const abort = () => process.kill(child.pid, "SIGKILL");

            try {
                if (timeout !== undefined && timeout > 0) {
                    timeoutHandle = setTimeout(() => {
                        timedOut = true;
                        process.kill(child.pid, "SIGKILL");
                    }, timeout * 1000);
                }

                if (signal) {
                    if (signal.aborted) abort();
                    else signal.addEventListener("abort", abort, { once: true });
                }

                const exitCode = await new Promise<number | null>((resolvePromise, reject) => {
                    child.once("error", reject);
                    child.once("close", (code) => resolvePromise(code));
                });

                if (signal?.aborted) throw new Error("aborted");
                if (timedOut) throw new Error(`timeout:${timeout}`);
                return { exitCode };
            } finally {
                if (timeoutHandle) clearTimeout(timeoutHandle);
                if (signal) signal.removeEventListener("abort", abort);
            }
        },
    };
}

function expandHome(path: string): string {
    if (path === "~") return homedir();
    if (path.startsWith("~/")) return join(homedir(), path.slice(2));
    return path;
}

function stripMatchingQuotes(value: string): string {
    if (value.length >= 2) {
        const first = value[0];
        const last = value[value.length - 1];
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
            return value.slice(1, -1);
        }
    }
    return value;
}

function resolveCdArg(args: string): string {
    const trimmed = stripMatchingQuotes(args.trim());
    if (!trimmed) return homedir();
    if (trimmed === "-" && previousCwd) return previousCwd;
    const expanded = expandHome(trimmed);
    return isAbsolute(expanded) ? resolve(expanded) : resolve(process.cwd(), expanded);
}

function setProcessCwd(target: string) {
    const before = process.cwd();
    process.chdir(target);
    previousCwd = before;
    process.env.OLDPWD = before;
    process.env.PWD = process.cwd();
}

function syncProcessCwd(cwd: string) {
    if (process.cwd() !== cwd) setProcessCwd(cwd);
}

function formatPath(path: string): string {
    const home = homedir();
    return path === home ? "~" : path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path;
}

function completeDirectories(prefix: string) {
    try {
        const raw = prefix.trimStart();
        const expanded = expandHome(raw || ".");
        const absolutePrefix = isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
        const baseDir = raw.endsWith("/") ? absolutePrefix : dirname(absolutePrefix);
        const needle = raw.endsWith("/") ? "" : basename(absolutePrefix);
        return readdirSync(baseDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && entry.name.startsWith(needle))
            .slice(0, 100)
            .map((entry) => {
                const value = join(baseDir, entry.name);
                return { value, label: formatPath(value) };
            });
    } catch {
        return null;
    }
}

export default function (pi: ExtensionAPI) {
    const fishOperations = createFishOperations();

    pi.on("session_start", async (_event, ctx) => {
        try {
            syncProcessCwd(ctx.cwd);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            ctx.ui.notify(`Could not sync process cwd to session cwd: ${message}`, "error");
        }
    });

    // Extra guard for resumed sessions: make process.cwd() match the active session
    // before agent tools run, so tools that rely on process cwd do not write to the
    // directory pi was originally launched from.
    pi.on("before_agent_start", async (_event, ctx) => {
        try {
            syncProcessCwd(ctx.cwd);
        } catch {
            // The tool/read layer will surface cwd problems if the directory is gone.
        }
    });

    pi.on("user_bash", (_event) => {
        // Honor /cd by using the Node process cwd, which this extension keeps in sync
        // with resumed sessions and updates from the /cd command.
        const cwd = process.cwd();
        return {
            operations: {
                exec(command, _cwd, options) {
                    return fishOperations.exec(command, cwd, options);
                },
            },
        };
    });

    pi.registerCommand("cd", {
        description: "Change pi's process/session cwd",
        getArgumentCompletions: (prefix: string) => completeDirectories(prefix),
        handler: async (args, ctx) => {
            await ctx.waitForIdle();

            const target = resolveCdArg(args);
            const info = await stat(target);
            if (!info.isDirectory()) throw new Error(`Not a directory: ${target}`);

            const oldProcessCwd = process.cwd();
            setProcessCwd(target);

            try {
                if (target === ctx.cwd) {
                    ctx.ui.notify(`Process cwd: ${formatPath(target)}`, "info");
                    return;
                }

                let targetSessionFile: string | undefined;
                const currentSessionFile = ctx.sessionManager.getSessionFile();
                if (currentSessionFile && existsSync(currentSessionFile)) {
                    targetSessionFile = SessionManager.forkFrom(currentSessionFile, target).getSessionFile();
                } else {
                    const targetSession = SessionManager.create(target);
                    targetSession.appendCustomEntry("cd", { createdBy: "cwd-and-fish", target });
                    targetSessionFile = targetSession.getSessionFile();
                }

                if (!targetSessionFile) {
                    ctx.ui.notify(`Process cwd: ${formatPath(target)} (session is not persisted)`, "info");
                    return;
                }

                const result = await ctx.switchSession(targetSessionFile, {
                    withSession: async (newCtx) => {
                        syncProcessCwd(target);
                        newCtx.ui.notify(`Changed cwd to ${formatPath(target)}`, "info");
                    },
                });

                if (result.cancelled) {
                    setProcessCwd(oldProcessCwd);
                }
            } catch (error) {
                setProcessCwd(oldProcessCwd);
                throw error;
            }
        },
    });
}
