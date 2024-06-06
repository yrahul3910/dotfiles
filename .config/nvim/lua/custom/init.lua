vim.opt.colorcolumn = "120"
vim.opt.foldmethod = "indent"
vim.opt.foldenable = false

vim.keymap.set("n", "<leader>xx", function() require("trouble").toggle() end)
vim.keymap.set("n", "<leader>xq", function() require("trouble").toggle("quickfix") end)

local function open_nvim_tree()
  -- open the tree
  require("nvim-tree.api").tree.open()
end

-- vim.api.nvim_create_autocmd({ "VimEnter" }, { callback = open_nvim_tree })
vim.api.nvim_set_keymap('v', '<leader>cc', '"*y', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<leader>tl', ':colorscheme newpaper<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<leader>o', ':put _<CR>', { noremap = true, silent = true })
vim.keymap.set("n", "<leader>a", "<cmd>AerialToggle!<CR>")

function _G.set_terminal_keymaps()
  local opts = {buffer = 0}
  vim.keymap.set('t', '<esc>', [[<C-\><C-n><C-w>j]], opts)
end

-- if you only want these mappings for toggle term use term://*toggleterm#* instead
vim.cmd('autocmd! TermOpen term://* lua set_terminal_keymaps()')
