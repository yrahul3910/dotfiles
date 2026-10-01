# Config files

Config files for quick setup.

## Bootstrapping

Run:

```sh
curl -sSL https://raw.githubusercontent.com/yrahul3910/dotfiles/master/bootstrap.sh | bash
```

Most important is probably the neovim config, which is tested on macOS, Ubuntu, and Arch.

All packages such as CLI tools, casks, and Go/Cargo binaries live in the [`Brewfile`](./Brewfile) and are installed with `brew bundle` on both macOS and Linux. On Linux, `setup.sh` first installs the distro packages Homebrew itself needs. Language toolchains (Node, Rust, free-threaded Python, uv) are declared in [`.config/mise/config.toml`](./.config/mise/config.toml) and installed with `mise install`. They track the newest release, except Python, which stays on one minor version until you edit it; run `mise upgrade` to update a machine.

Dotfiles are linked with `stow --no-folding --restow .`, so every directory under `~` is a real directory and only tracked files are symlinks. Git hooks in `.githooks` run `sync-links.sh` after every commit, pull, checkout, and rebase, so added, renamed, and deleted files are linked or unlinked automatically. It also removes links left behind when a whole folder is deleted, which stow misses. For changes you have not committed yet, run `./sync-links.sh` yourself; `./sync-links.sh --dry-run` shows what it would do. `setup.sh` turns the hooks on in each new clone. Paths that must never be linked go in `.stow-local-ignore`. The exception is `.pi/agent/extensions`, which `setup.sh` links as one directory because Pi resolves extension imports from the link path and needs the repo's `node_modules` next to each extension.

## Requirements

* GNU Stow

## Included configs

* Agents: pi, Codex, Claude Code, OpenCode
* Editors: Helix, Neovim, Zed
* Firefox: `user.js` (move this to the right folder)
* Keyboard remapping: Karabiner, kanata
* Python: python, pip
* Shells: bash, fish, zsh
* Terminals: Ghostty, kitty
* VCS: git, jj
* Other stuff: tmux, yazi, starship, editrc/inputrc, latexmk, prettier

## Fish configuration

`fish` is configured to use vim bindings, and `/` in normal mode searches command history using `fzf`. The following custom functions exist: 

* `prdiff` shows a git diff between two refs (e.g., `prdiff origin/main..HEAD -- .`)
* `mkcd` creates and goes into a new directory. 
* `so` sources the fish config.
* `up <number>` goes up a specified number of directories.
* `tl` and `td` change to light and dark theme respectively.
* `copyenv` copies `.env` from this repo (so you'll need one here) to wherever you are. Then, it checks if you're in a git repo. If so, it checks whether the `.gitignore` contains a `.env`; if not (or if there is no `.gitignore`), it adds it. `envsource` uses the arg passed to it and sources the variables into the shell.

## Neovim configuration

See `.config/nvim/README.md`

## tmux config

Here are the keybindings in tmux/tmux-sessionizer:

* `<C-a>` is the leader.
* `<C-a>f` opens a fuzzy-finder within the directories specified in `tmux-sessionizer`, with the depth specified there. It either creates or switches to the session you select.
    * `<M-f>` is a quick-access to this.
* `<C-a>w` shows a list of tmux windows and sessions in those windows.
* `<C-a>L` goes back and forth between your current and most recently used session.
* `<C-a>o` goes back and forth between your current and most recently used window.
* `<C-a>,` lets you rename windows.
* `<C-a>.` lets you re-number windows.
* `<C-a>x` lets you delete a window.
* `<C-M-h>` and `<C-M-l>` lets you move to the left and right windows from where you are.
* `<M-1>` through `<M-4>` let you go to the first (through fourth) window.
* `<C-a>S` swaps your current window with another (based on input).

## Karabiner-Elements

On macOS, home-row mods are implemented using Karabiner-Elements, which I find works a bit better than kanata.

* `s` has mod-tap behavior and maps to (Left) Shift.
* `f` has mod-tap behavior and maps to Left Meta (this is Left Option).
* Caps Lock has mod-tap behavior and maps to Escape or Ctrl.
* If for some reason you need Caps Lock, Right Command maps to it.

## kanata config

kanata is Linux-only here; on macOS, Karabiner-Elements does the remapping. `setup.sh` installs kanata from the Brewfile and gives it access to input devices through a udev rule and the `input` and `uinput` groups. Log out and back in once so the new groups apply, then start the user service:

```
systemctl --user daemon-reload
systemctl --user enable --now kanata.service
systemctl --user status kanata.service
```
