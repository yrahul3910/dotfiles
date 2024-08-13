# Keybindings

Here are the most important keybindings. Some come from Kickstart, but most are custom.

* `<C-\>` opens a floating terminal window. You can use `<number><C-\>` to open a different one. When the floating window is open, you can be in insert or normal mode; in insert mode, `Esc` will hide the window. In normal mode, use `<C-\>` again.
* `<C-]>` goes to definition, including going inside libraries.
* `V` selects the current line in visual mode. You can then move the selected lines using `J` and `K`.
* Generally, `j` goes UP and `k` goes DOWN. I prefer it this way.
* Finding uses the following keymaps (all preceded by a space, which is the leader key):
  * Space finds open file names.
  * `/` searches in the current buffer.
  * `fg` finds across all files (except those in gitignore).
  * `ff` searches file names (except those in gitignore).
  * `fh` searches the help sections.
  * `fr` resumes the previous search.
  * `fw` searches for the current word.
  * `f/` searches in open buffers.
* `<leader>a` toggles the Aerial window (which shows a list of classes, functions, etc.)
* `<leader>d` and `<leader>c` are mapped to `"_d` and `"_c`. This makes sure it doesn't overwrite your clipboard when you delete or change text.
* `<leader>o` creates a new blank line below the current one, without leaving normal mode.
* `<leader>bc` closes the current buffer.
* For testing, the following exist (preceded by the leader key):
  * `tr` runs the nearest test.
  * `tf` runs all tests in the current file.
  * `to` shows the test output.
* `<leader>xc` makes the file executable.methods 
* `<leader>ph` leads to Harpoon2 keybindings.
* `<leader>fm` formats the current buffer (or at least, attempts to).
