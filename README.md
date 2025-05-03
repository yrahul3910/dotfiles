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
* kanata

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
    * `<M-f>` is a quick-access to this.
* `<C-a>w` shows a list of tmux windows and sessions in those windows.
* `<C-a>L` goes back and forth between your current and most recently used window.
* `<C-a>,` lets you rename windows.
* `<C-a>.` lets you re-number windows.
* `<C-a>x` lets you delete a window.
* `<C-M-h>` and `<C-M-l>` lets you move to the left and right windows from where you are.
* `<M-1>` through `<M-4>` let you go to the first (through fourth) window.
* `<C-a>S` swaps your current window with another (based on input).

## kanata config

You will probably want to change the device file location in `.config/kanata/config.kbd`. Also, if the following does not work, you may want to instead move the systemd config file to `/etc/systemd/system` instead (and in this case, remove `--user`).

```
systemctl --user daemon-reload
systemctl --user enable kanata.service
systemctl --user start kanata.service
systemctl --user status kanata.service
```
