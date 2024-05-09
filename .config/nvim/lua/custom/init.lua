vim.opt.colorcolumn = "120"
vim.opt.foldmethod = "indent"
vim.opt.foldenable = true

vim.keymap.set("n", "<leader>xx", function() require("trouble").toggle() end)
vim.keymap.set("n", "<leader>xq", function() require("trouble").toggle("quickfix") end)
