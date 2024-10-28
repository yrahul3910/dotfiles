# Config files

Config files for quick setup.

## Bootstrapping

In theory, this should work:

```sh
curl -sSL https://raw.githubusercontent.com/yrahul3910/configs/master/bootstrap.sh | bash
```

Most important is probably the neovim config, which mostly works on macOS and Ubuntu.

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

## Installation

First, checkout the repo to your `$HOME` directory:

```sh
git clone https://github.com/yrahul3910/configs.git
cd configs
```

Then, use GNU Stow to create symlinks to your configs:

```sh
stow .
```

## Neovim configuration

See `.config/nvim/README.md`

## tmux config

Here are the keybindings in tmux/tmux-sessionizer:

* `<C-a>` is the leader.
* `<C-a>f` opens a fuzzy-finder within the directories specified in `tmux-sessionizer`, with the depth specified there. It either creates or switches to the session you select.
* `<C-a>w` shows a list of tmux windows and sessions in those windows.
* `<C-a>L` goes back and forth between your current and most recently used window.
* `<C-a>,` lets you rename windows.
* `<C-a>.` lets you re-number windows.
* `<C-a>x` lets you delete a window.
