local function map_normal(keys, mapping, desc)
  vim.keymap.set('n', keys, mapping, { desc = desc, noremap = true, silent = true })
end

-- Custom
map_normal('<leader>o', 'o<Esc>S<Esc>k', 'New empty line below')
map_normal('<leader>O', 'O<Esc>S<Esc>j', 'New empty line above')
map_normal('n', 'nzzzv', 'Next') -- From LazyVim, centers the screen after jumping

-- Some mappings inspired by Helix (Kakoune mappings)
map_normal('gh', '^', 'Move to first word') -- Somewhat different from helix
map_normal('gl', '$b', 'Move to end of line')
map_normal('ge', 'G', 'Move to end of file')

-- Convenience mappings
map_normal('gb', 'kJi', 'Go back (to prev line)')
map_normal('<leader>lr', ':LspRestart<CR>', '[L]SP [R]estart')

-- Mappings from ThePrimeagen
-- Lets you move selected block around in visual mode
vim.keymap.set('v', 'K', ":m '>+1<CR>gv=gv", { noremap = true, silent = true })
vim.keymap.set('v', 'J', ":m '<-2<CR>gv=gv", { noremap = true, silent = true })

-- Keeps your cursor steady when moving up and down half-pages
vim.keymap.set('n', '<C-d>', '<C-d>zz', { noremap = true, silent = true })
vim.keymap.set('n', '<C-u>', '<C-u>zz', { noremap = true, silent = true })

vim.keymap.set('n', 'Q', '<nop>', { noremap = true, silent = true })
vim.keymap.set('n', '<leader>xc', '<cmd>!chmod +x %<CR>', { noremap = true, silent = true, desc = 'Make executable' })
-- End Primeagen mappings

-- Swap j and k
vim.api.nvim_set_keymap('n', 'j', 'k', { noremap = true })
vim.api.nvim_set_keymap('n', 'k', 'j', { noremap = true })
vim.api.nvim_set_keymap('n', 'gj', 'gk', { noremap = true })
vim.api.nvim_set_keymap('n', 'gk', 'gj', { noremap = true })
vim.api.nvim_set_keymap('v', 'j', 'k', { noremap = true })
vim.api.nvim_set_keymap('v', 'k', 'j', { noremap = true })

-- Optional, but nice-to-haves
vim.keymap.set('n', 'k', "v:count == 0 ? 'gj' : 'j'", { expr = true, noremap = true })
vim.keymap.set('n', 'j', "v:count == 0 ? 'gk' : 'k'", { expr = true, noremap = true })

-- Delete without copying
vim.keymap.set('n', '<leader>d', '"_d', { noremap = true, silent = true })
vim.keymap.set({ 'n', 'v' }, '<leader>c', '"_c', { noremap = true, silent = true })
vim.api.nvim_set_keymap('v', '<leader>yc', '"*y', { noremap = true, silent = true, desc = '[Y]ank to [C]lipboard' })

-- fzf-lua
local fzf = require 'fzf-lua'
map_normal('<leader>ff', fzf.files, '[F]ind [F]iles')
map_normal('<leader>fb', fzf.buffers, '[F]ind [B]uffers')
map_normal('<leader>fc', '/<<<<CR>', '[F]ind [C]onflicts')
map_normal('<leader>fg', fzf.live_grep_native, '[F]ind by [G]rep')
map_normal('<leader>fr', fzf.live_grep_resume, '[F]ind [R]esume')
map_normal('<leader>fG', fzf.live_grep_glob, '[F]ind by grep with [G]lob')
map_normal('<leader>fh', fzf.helptags, '[F]ind [H]elp')
map_normal('<leader>fd', fzf.diagnostics_document, '[F]ind [D]iagnostics')
map_normal('<leader>fs', fzf.lsp_document_symbols, '[F]ind [S]ymbols')
map_normal('<leader>ca', fzf.lsp_code_actions, '[C]ode [A]ctions')
map_normal('<leader>gd', fzf.lsp_definitions, '[G]o to [D]efinition')

-- nvim-tree
map_normal('<C-s>', '<cmd>NvimTreeToggle<CR>', 'Toggle NvimTree')
map_normal('<leader>pTr', '<cmd>NvimTreeRefresh<CR>', 'Refresh NvimTree')
map_normal('<leader>pTm', '<cmd>NvimTreeResize -10<CR>', 'nvim-tree [m]inus')
map_normal('<leader>pTp', '<cmd>NvimTreeResize +10<CR>', 'nvim-tree [p]lus')

-- aerial
map_normal('<leader>a', '<cmd>AerialToggle!<CR>', 'Toggle Aerial window')

-- neotest
map_normal('<leader>tr', function()
  require('neotest').run.run()
end, 'neotest: Run nearest')

map_normal('<leader>tf', function()
  require('neotest').run.run(vim.fn.expand '%')
end, 'neotest: Test file')

map_normal('<leader>to', function()
  require('neotest').output.open()
end, 'neotest: Open output')

-- toggleterm
function _G.set_terminal_keymaps()
  local opts = { buffer = 0 }
  vim.keymap.set('t', '<esc>', [[<C-\><C-n><C-w>j]], opts)
end
vim.cmd 'autocmd! TermOpen term://* lua set_terminal_keymaps()'

-- bufferline + scope
map_normal('<tab>', '<cmd>bnext<CR>', 'Next buffer')
map_normal('<S-tab>', '<cmd>bprev<CR>', 'Previous buffer')
map_normal('<leader>bc', '<cmd>bdelete<CR><cmd>bprevious<CR>', '[B]uffer [C]lose')

-- nvim-spider
vim.keymap.set({ 'n', 'o', 'x' }, 'W', '<cmd>lua require("spider").motion("w")<CR>', { desc = 'Spider-w' })
vim.keymap.set({ 'n', 'o', 'x' }, 'E', '<cmd>lua require("spider").motion("e")<CR>', { desc = 'Spider-e' })
vim.keymap.set({ 'n', 'o', 'x' }, 'B', '<cmd>lua require("spider").motion("b")<CR>', { desc = 'Spider-b' })

-- theme
map_normal('<leader>cl', function()
  require('colorscheme-picker').change 'catppuccin'
end, '[C]olorscheme [L]ight')
map_normal('<leader>cd', function()
  require('colorscheme-picker').change 'onedark'
end, '[C]olorscheme [D]ark')

-- function totally_harmless_dont_worry()
--   local click_pos = vim.fn.getmousepos()
--   local target_win = click_pos.winid
--   vim.fn.win_gotoid(target_win)
--
--   local row = click_pos.line - 1
--   local col = click_pos.column - 1
--
--   vim.api.nvim_win_set_cursor(0, { row + 1, col })
--   vim.cmd 'normal! x'
-- end
--
-- map_normal('<LeftMouse>', '<cmd>lua totally_harmless_dont_worry()<CR>')
