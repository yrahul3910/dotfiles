vim.opt.colorcolumn = "120"
vim.opt.foldmethod = "indent"
vim.opt.foldenable = false

vim.keymap.set("n", "<leader>xx", function() require("trouble").toggle() end, { silent = true, noremap = true, desc = "Trouble: Toggle" })
vim.keymap.set("n", "<leader>xq", function() require("trouble").toggle("quickfix") end)

local function open_nvim_tree()
  -- open the tree
  require("nvim-tree.api").tree.open()
end

-- vim.api.nvim_create_autocmd({ "VimEnter" }, { callback = open_nvim_tree })
vim.api.nvim_set_keymap('v', '<leader>cc', '"*y', { noremap = true, silent = true, desc = "Copy to clipboard" })
vim.api.nvim_set_keymap('n', '<leader>tl', ':colorscheme newpaper<CR>', { noremap = true, silent = true, desc = "Light theme" })
vim.api.nvim_set_keymap('n', '<leader>o', ':put _<CR>', { noremap = true, silent = true, desc = "New line below" })
vim.keymap.set('n', '<leader>fr', function() require('telescope.builtin').lsp_references() end, { noremap = true, silent = true, desc = "Find references" })
vim.keymap.set("n", "<leader>a", "<cmd>AerialToggle!<CR>")

-- Needed for auto-session
vim.o.sessionoptions="blank,buffers,curdir,folds,help,tabpages,winsize,winpos,terminal,localoptions"

-- Keymaps for tests
vim.keymap.set("n", "<leader>tr", function() require("neotest").run.run() end, { noremap = true, silent = true, desc = "neotest: Run nearest test" })
vim.keymap.set("n", "<leader>tf", function() require("neotest").run.run(vim.fn.expand("%")) end, { noremap = true, silent = true, desc = "neotest: Test current file" })
vim.keymap.set("n", "<leader>to", function() require("neotest").output.open() end, { noremap = true, silent = true, desc = "neotest: Open test output" })
vim.keymap.set("n", "<leader>ts", function() require("neotest").summary.toggle() end, { noremap = true, silent = true, desc = "neotest: Toggle summary" })

-- vim.api.nvim_set_keymap("n", "gr", "<cmd>lua require('nice-reference').references()<CR>", { noremap = true, silent = true, desc = "Nice reference: Show references" })
vim.api.nvim_set_keymap("n", "<leader>gr", "<cmd>Telescope lsp_references<CR>", { noremap = true, silent = true, desc = "Show references" })

function _G.set_terminal_keymaps()
  local opts = {buffer = 0}
  vim.keymap.set('t', '<esc>', [[<C-\><C-n><C-w>j]], opts)
end

-- if you only want these mappings for toggle term use term://*toggleterm#* instead
vim.cmd('autocmd! TermOpen term://* lua set_terminal_keymaps()')

local num_lines_padding = 20

function EnsurePadding()
    local current_line = vim.fn.line('.')
    local total_lines = vim.fn.line('$')
    local lines_below = total_lines - current_line
    local lines_to_scroll = math.min(num_lines_padding, lines_below)

    if lines_to_scroll > 0 then
        vim.cmd('normal! ' .. lines_to_scroll .. 'j' .. lines_to_scroll .. 'k')
    end

    local lines_above = vim.fn.line('w0')
    local lines_to_scroll_above = math.min(num_lines_padding, lines_above)

    if lines_to_scroll_above > 0 then
        vim.cmd('normal! ' .. lines_to_scroll_above .. 'k' .. lines_to_scroll_above .. 'j')
    end
end
-- Map <leader>a to the ensure_lines_below function
vim.api.nvim_set_keymap('n', '<leader>ll', ':lua EnsurePadding()<CR>',
  { noremap = true, silent = true, desc = "Ensure " .. num_lines_padding .. " lines of padding" })


