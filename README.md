# Config files

Config files for quick setup.

## Bootstrapping

In theory, this should work:

```sh
curl -sSL https://raw.githubusercontent.com/yrahul3910/configs/master/bootstrap.sh | sh
```

Most important is probably the neovim config, which mostly works on macOS and Ubuntu.

## Requirements

* GNU Stow

## Included configs

* Plain ViM
* Neovim/NVChad
* Firefox `user.js` (move this to the right folder)
* fish
* zsh
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

## (Plain) ViM features

* Mouse enabled
* Terminal splits at bottom (use `:term zsh`)
* Code completion (using `YouCompleteMe`)
* PEP8/Flake8 checking and auto-correcting
* Buffer tabs (via `vim-buftabline`)
* File explorer (using `NERDTree`)
* Status bar with errors (using `vim-airline`)
* `Shift-D` to go to definition; `Shift-t` to get the type, `Shift-?` to get documentation (using `YouCompleteMe`)
* 24-bit color when outside tmux
* 4-width spaces for indent
* Code folding enabled
