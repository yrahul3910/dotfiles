# Pi config

## Extensions:

### External

* Subagents, via `npm:@tintinweb/pi-subagents`
* MCP, via `npm:pi-mcp-extension` with two servers configured to use OAuth:
    * Linear
    * Firecrawl
* Permissions, via `github.com/yrahul3910/pi-permission-system`, a fork that adds vouching, potentially dangerous subcommand/option registry, and some other protections.

### In this repo

* `clipboard-image` - allowing pasting images.
* `cwd-and-fish.ts` - a `/cd` command and better `fish` integration.
* `effort.ts` - automatic effort setting.
* `vim.ts` - vim motions.
* `ask-user` - letting the agent ask questions.
* `background-terminals` - background terminals.
* `pixilate` - adds little pixel characters that roam around.
* `pr-review` - installs a GitHub Actions workflow for automatic Pi PR reviews.

## Skills

* `background-terminals` for using the `background-terminals` extension
* `code-style`, for... code style rules.
* `design-doc`, for writing design docs and self-critiquing via the `critic` agent.
* `okf`, for the Google OKF wiki spec.

## Attributions

* `background-terminals` skill and extension from [davis7dotsh/my-pi-setup](https://github.com/davis7dotsh/my-pi-setup/blob/main/skills/background-terminals/SKILL.md).
* `clipboard-image` extension from [samfoy/pi-essentials](https://github.com/samfoy/pi-essentials/blob/master/src/clipboard-image.ts).
* `vim` extension from [annapurna-himal/pi-vim-editor](https://github.com/annapurna-himal/pi-vim-editor/blob/main/index.ts).
