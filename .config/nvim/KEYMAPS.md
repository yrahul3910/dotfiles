# Keybindings

Here are the keybindings. Some come from Kickstart, but most are custom.

## Movement

* `<C-]>` goes to definition, including going inside libraries.
* `gh` goes to the beginning of the first word in the current line (same as `_`). `gl` goes to the end of the line (the same as `$`). `ge` goes to the end of the file. These were inspired by Helix.
* `j` goes UP and `k` goes DOWN. I prefer it this way.
* `V` selects the current line in visual mode. You can then move the selected lines using `J` and `K`.

> [!NOTE]
> The following are nvim 0.11+

* `]q`, `[q`, `]Q`, `[Q` navigate through the quickfix list.
* `]a`, `[a`, `[A`, `]A` navigate through the argument list.
* `]b`, `[b`, `]B`, `[B` navigate through the buffer list (but `Tab` and `<S-Tab>` will still be preferred.
* `[<Space>` and `]<Space>` add a blank line above and below the cursor.

## Search

* Finding uses the following keymaps (all preceded by a space, which is the leader key):
  * Space finds open file names.
  * `/` searches in the current buffer.
  * `fb` finds across open buffers.
    * In this picker, in insert mode, `<M-d>` closes the buffer.
  * `ff` searches file names (except those in gitignore).
  * `fg` finds across all files (except those in gitignore).
  * `fG` finds across all files (except those in gitignore), but has glob support. This is slower than `fg`, though, so it's a trade-off.
  * `fh` searches the help sections.
  * `fr` resumes the previous search.
  * `f/` searches in open buffers.
  * `ws` searches the workspace symbols.

## Git

* `<leader>fc` finds the next conflict.
* `<leader>gcu` chooses the upstream version of the code in a 3-way merge conflict (this is usually the first section).
* `<leader>gcb` chooses the base version of the code (this is usually the second section).
* `<leader>gcs` chooses the stashed version of the code (this is usually the third section).
* `<leader>gw` uses `gitsigns` to open a `git blame` pane.
* `<leader>Gd` opens `diffview`, which lets you go through the commit history of open buffers (I think).
* `<leader>Gh` does this for the current file.

## LSP

* `<leader>gr` finds references.
* `<leader>ca` shows code actions.
* `<leader>lh` toggles inlay hints. By default, they are off.
* `<leader>li` shows LSP info.

> [!NOTE]  
> Since nvim 0.11, there are default keymaps for LSP. Note that these will add the results to the quickfix list, as
> opposed to Telescope.

* `grr` goes to references.
* `grn` renames the variable.
* `gri` goes to implementation.
* `gra` shows code actions.
* `<C-S>` in insert and select mode shows signature help.

## Plugin-specific

* (aerial) `<leader>a` toggles the Aerial window (which shows a list of classes, functions, etc.)
* (bufferline) `<leader>bc` closes the current buffer.
* (bufferline) `<leader>ba` closes all buffers except the current one.
* (conform) `<leader>fm` formats the current buffer (or at least, attempts to).
* (harpoon2) `<leader>ph` leads to Harpoon2 keybindings. After this prefix, `a` adds the current file, `d` deletes the current file, and `o` opens the list of files in Telescope.
* (harpoon2) `<M-h>`, `<M-j>`, `<M-k>`, `<M-l>` switch between Harpoon buffers.
* (nvim-tree) `<leader>pt` leads to nvim-tree keybindings. Use `p` to increase the width and `m` to decrease.
* (nvim-tree) `<C-s>` toggles the file tree. Use `<leader>pr` to refresh it.
* (nvim-treesitter-textobjects) `K` previews declaration, so I mapped `<leader>kf` to peek at definition, using `nvim-treesitter-textobjects`. Use the keybinding twice to enter the peek window. There's also the less useful `<leader>kF`, which peeks at the class definition.

## Tests

* For testing, the following exist (preceded by the leader key):
  * `tf` runs all tests in the current file.
  * `to` shows the test output.
  * `tr` runs the nearest test.

## Copy/paste

* `<leader>d` and `<leader>c` are mapped to `"_d` and `"_c`. This makes sure it doesn't overwrite your clipboard when you delete or change text.
* `<leader>yc` in visual mode yanks to clipboard.
* `<leader>yf` in normal mode copies the URL of the current file in source control to the clipboard. This only works for ADO and GitHub, currently.
* `<leader>yiq` in normal mode copies the nearest quotes to the clipboard.
* `x` in normal mode has been changed to not overwrite the vim clipboard.

## Miscellaneous

* `<leader>xc` makes the file executable.
* `<leader>cl` changes the colorscheme to light. Of course, `<leader>cd` changes to dark.
* `<leader>tc` closes the current vim tab. This is not to be confused with the current buffer.
* `<leader>xc` makes the current file executable.
