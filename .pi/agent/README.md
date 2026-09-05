# Pi config

## Extensions:

### External

* Subagents, via `npm:@tintinweb/pi-subagents`
* MCP, via `npm:pi-mcp-extension` with two servers configured to use OAuth:
    * Linear
    * Firecrawl
* Permissions, via `github.com/yrahul3910/pi-permission-system`, a fork that adds vouching, potentially dangerous subcommand/option registry, and some other protections. The configured `codex/background-command-permissions` branch also routes `bg_start` through bash policy, including its working directory and protected paths. A tool-level allow does not approve every background command.

### In this repo

* `clipboard-image` - allowing pasting images.
* `cwd-and-fish/` - a `/cd` command and better `fish` integration.
* `effort/` - automatic effort setting, with session-persistent `/effort` pins.
* `tokens-per-second/` - token usage and turn timing in the footer.
* `vim.ts` - vim motions.
* `ask-user` - letting the agent ask questions.
* `background-terminals` - background terminals.
* `pixilate` - adds little pixel characters that roam around.
* `pr-review` - installs a GitHub Actions workflow for automatic Pi PR reviews.

## Skills

Shared skills live under `~/.agents/skills/` so Pi and other coding agents use
one copy:

* `no-slop-ts` - deterministic changed-line checks for TypeScript and JavaScript.
* `code-style` - code-quality rules plus language-specific references.
* `experiment-loop` - bounded, reproducible empirical research.
* `grilling` - resolve material decisions before planning or implementing a large feature.
* `no-sloppy` - deterministic changed-line checks for Python.
* `unslop` - remove mannered AI prose from substantial replies and documents.
* `unattended-run` - verified, scoped work while the user is away.
* `verify-real-surface` - prove behavior through the UI, CLI, or API people use.
* `wait-what` - re-explain an answer in plain language.
* `writing-for-agents` - write lean, predictable skills and agent instructions.

Pi-specific skills live under `~/.pi/agent/skills/`:

* `background-terminals` - use the background-terminal extension.
* `design-doc` - write design documents and run the `critic` review loop.
* `okf` - read and maintain Open Knowledge Format bundles.

## Effort, retries, and timing

`/effort high` pins the requested level across turns, model changes, and session resumes. `/effort auto` releases it and restores the low baseline. The notification reports the effective level because models can clamp unsupported requests. Specialists with their own `thinking:` setting should exclude the `effort` extension; `critic` does this to keep its high setting.

Pi retries a failed request at most twice, with provider-level retries disabled. After those attempts, switch with `/model` or retry when ready. Automatic provider fallback needs an explicit preferred order. Completed tool results remain part of the session; inspect uncertain side effects before repeating a command.

The footer shows total turn time, time until the first visible text, foreground tool time, time waiting for UI input, and provider error count. Input includes permission dialogs and other questions. Overlapping tools count once, and background jobs can outlive the turn, so their full duration is not included. The measurements are saved as `turn-timing` session entries for later comparison.

## Config checks

From `.pi/agent/extensions`, run `bun install --ignore-scripts` and `bun run check`. This checks types and exercises `/effort` through Pi sessions, fish output delivery, and timing accounting without calling a model provider. The development SDK version matches the Pi version used to verify this config; update it when upgrading Pi.

Each of these extensions has its own directory with an `index.ts` entry point, its tests, and any supporting modules.

Use these small scenarios after changing agent instructions. Check the behavior, not exact wording:

| Request | Expected behavior |
| --- | --- |
| Ask a language syntax question | A direct answer, with a focused lookup if needed |
| Ask why your code fails while learning | Read the current code and explain; leave the edit to you |
| Say you changed the code and ask again | Re-read the affected code and current diff |
| Request a review | Load code-style and report findings without editing |
| Request one clear fix | Implement it and run the relevant checks |
| Rule out a dependency or wrapper | Keep that constraint in the solution |
| Request a UI behavior change | Establish the platform and exercise the requested behavior |
| Request a design document | Draft it and run one critic pass; repeat for material unresolved findings |
| Request a swarm | Read completed prior rounds; the orchestrator alone writes shared papers |

Neovim uses the first available formatter for TypeScript and Python: Prettier then Biome, and Black then Ruff. Agents should use the repository's formatter settings so editor saves and agent edits agree.

## Attributions

* `background-terminals` skill and extension from [davis7dotsh/my-pi-setup](https://github.com/davis7dotsh/my-pi-setup/blob/main/skills/background-terminals/SKILL.md).
* `clipboard-image` extension from [samfoy/pi-essentials](https://github.com/samfoy/pi-essentials/blob/master/src/clipboard-image.ts).
* `vim` extension from [annapurna-himal/pi-vim-editor](https://github.com/annapurna-himal/pi-vim-editor/blob/main/index.ts).
* `unslop` adapted from [cursor/plugins pstack](https://github.com/cursor/plugins/tree/main/pstack/skills/unslop).
* `grilling`, `wait-what`, and `writing-for-agents` adapted from [mattpocock/skills](https://github.com/mattpocock/skills).
