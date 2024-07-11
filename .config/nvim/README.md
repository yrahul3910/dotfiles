# Neovim config

This document goes over how this neovim config is set up. Briefly, this is a modification of [NvChad](https://nvchad.com/). Most important are the keybindings, which are detailed below:

* `j` and `k` are reversed. I prefer it this way.
* `<C-\>` opens a new [terminal](https://github.com/akinsho/toggleterm.nvim). You can use `<num><C-\>` to open a different terminal. Inside the floating terminal window, `<Esc>` will go back while leaving the process running in the background.
    * Inside this terminal, if you want to move up and down, you'll have to do so in Normal mode. However, since Esc is configured to close the terminal, you could `<Esc><C-\` or `<C-\><C-n>`.
* `<leader>bc` closes the current buffer.
* `<leader>a` shows the [aerial](https://github.com/stevearc/aerial.nvim) window.
* `<C-]>` goes to definition. Do NOT use `gd` or `gD`! Those are broken.
* `<leader>fw` finds all occurrences of some string using [ripgrep](https://github.com/BurntSushi/ripgrep)
* `<leader>ff` is find files.
* `<leader>o` adds a new line below, but does not enter insert mode like `o` does.
* `<leader>th` shows all available themes, and `<leader>tl` switches to a light theme.
* `<leader>xx` shows the [trouble](https://github.com/folke/trouble.nvim) window.
* `<C-n>` opens up `nvim-tree`.
* `<leader>ll` tries to make sure at least 20 lines around your cursor are visible, so that your cursor isn't at the bottom.
* In visual mode (ideally using `V`), using J/K will move the selected lines up or down, indenting as needed.
* In normal mode, `<C-d>` goes down half a page, and `<C-u>` goes up half a page
* `<leader>xc` makes the current file executable.
* `d` and `c` in normal mode are mapped to `"_d` and `"_c` respectively so that it doesn't overwrite your clipboard. As a side-effect, you can't use these letters as marks or macros.

## Unchanged but good to know

* `V` (capital) will select the current line in visual mode. You can then use j/k to go up and down and select those lines too.
* `:NvimTreeResize +/-x` is nice for resizing `nvim-tree`.
* You can use `m[char]` to mark a line, and `<leader>ma` will show you all the marks in Telescope.
