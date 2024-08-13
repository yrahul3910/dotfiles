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
