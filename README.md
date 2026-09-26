# Config files

Config files for quick setup.

## Bootstrapping

In theory, this should work:

```sh
curl -sSL https://raw.githubusercontent.com/yrahul3910/dotfiles/master/bootstrap.sh | bash
```

Most important is probably the neovim config, which mostly works on macOS and Ubuntu.

All packages — CLI tools, casks, and Go/Cargo binaries — live in the [`Brewfile`](./Brewfile) and are installed with `brew bundle` on both macOS and Linux. Casks and macOS-only formulae are guarded with `OS.mac?`. On Linux, `setup.sh` first installs the distro packages Homebrew itself needs. Language toolchains (Node, Rust, free-threaded Python, uv) are declared in [`.config/mise/config.toml`](./.config/mise/config.toml) and installed with `mise install`. They track the newest release, except Python, which stays on one minor version until you edit it; run `mise upgrade` to update a machine.

Dotfiles are linked with `stow --no-folding --restow .`, so every directory under `~` is a real directory and only tracked files are symlinks. App state written next to tracked config (for example `~/.config/gh/` or `~/.pi/agent/sessions/`) stays in `~` rather than in this checkout. After adding a file to the repo, run `stow --no-folding --restow .` from `~/configs` (or re-run `setup.sh`) to link it. Paths that must never be linked go in `.stow-local-ignore`. The exception is `.pi/agent/extensions`, which `setup.sh` links as one directory because Pi resolves extension imports from the link path and needs the repo's `node_modules` next to each extension.

## Requirements

* GNU Stow

## Included configs

* Neovim
* Firefox `user.js` (move this to the right folder)
* fish
* zsh
* kitty
* Karabiner
* yazi
* git
* pip
* starship.rs
* kanata

## Installation

First, checkout the repo to your `$HOME` directory:

```sh
git clone https://github.com/yrahul3910/dotfiles.git
cd configs
```

Then, use GNU Stow to create symlinks to your configs:

```sh
stow .
```

## Fish configuration

`fish` is configured to use vim bindings, and `/` in normal mode searches command history using `fzf`. The following custom functions exist: 

* `mkcd` creates and goes into a new directory. 
* `so` sources the fish config.
* `up <number>` goes up a specified number of directories.
* `tl` and `td` change to light and dark theme respectively.
* `copyenv` copies `.env` from this repo (so you'll need one here) to wherever you are. Then, it checks if you're in a git repo. If so, it checks whether the `.gitignore` contains a `.env`; if not (or if there is no `.gitignore`), it adds it.

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
