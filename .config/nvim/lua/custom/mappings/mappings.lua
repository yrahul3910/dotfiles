local function map_normal(keys, mapping, desc)
  vim.keymap.set('n', keys, mapping, { desc = desc, noremap = true, silent = true })
end

local function go_to_beginning()
  local current_line = vim.fn.getline '.'
  if current_line:match '^%s+' then
    vim.cmd 'normal! 0w'
  else
    vim.cmd 'normal! 0'
  end
end

-- Custom
map_normal('<leader>o', 'o<Esc>k', 'New empty line below')
map_normal('<leader>O', 'O<Esc>j', 'New empty line above')
map_normal('<leader>i', 'O', 'New empty line above (and stay)')

-- Some mappings inspired by Helix (Kakoune mappings)
map_normal('gh', go_to_beginning, 'Move to first word') -- Somewhat different from helix
map_normal('gl', '$', 'Move to end of line')
map_normal('ge', 'G', 'Move to end of file')

-- Mappings from ThePrimeagen
-- Lets you move selected block around in visual mode
vim.keymap.set('v', 'K', ":m '>+1<CR>gv=gv", { noremap = true, silent = true })
vim.keymap.set('v', 'J', ":m '<-2<CR>gv=gv", { noremap = true, silent = true })

-- Keeps your cursor steady when moving up and down half-pages
vim.keymap.set('n', '<C-d>', '<C-d>zz', { noremap = true, silent = true })
vim.keymap.set('n', '<C-u>', '<C-u>zz', { noremap = true, silent = true })

vim.keymap.set('n', 'Q', '<nop>', { noremap = true, silent = true })
vim.keymap.set('n', '<leader>xc', '<cmd>!chmod +x %<CR>', { noremap = true, silent = true, desc = 'Make executable' })

-- Swap j and k
vim.api.nvim_set_keymap('n', 'j', 'k', { noremap = true })
vim.api.nvim_set_keymap('n', 'k', 'j', { noremap = true })
vim.api.nvim_set_keymap('n', 'gj', 'gk', { noremap = true })
vim.api.nvim_set_keymap('n', 'gk', 'gj', { noremap = true })
vim.api.nvim_set_keymap('v', 'j', 'k', { noremap = true })
vim.api.nvim_set_keymap('v', 'k', 'j', { noremap = true })

-- Delete without copying
vim.keymap.set('n', '<leader>d', '"_d', { noremap = true, silent = true })
vim.keymap.set({ 'n', 'v' }, '<leader>c', '"_c', { noremap = true, silent = true })
vim.api.nvim_set_keymap('v', '<leader>yc', '"*y', { noremap = true, silent = true, desc = '[Y]ank to [C]lipboard' })

-- nvim-tree
map_normal('<C-n>', '<cmd>NvimTreeToggle<CR>', 'Toggle NvimTree')
map_normal('<leader>pr', '<cmd>NvimTreeRefresh<CR>', 'Refresh NvimTree')

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

-- trouble
map_normal('<leader>pt', function()
  require('trouble').toggle()
end, '[P]lugin: trouble')

map_normal('<leader>pf', function()
  require('trouble').toggle 'quickfix'
end, '[P]lugin: trouble fix')

-- theme
map_normal('<leader>cl', function()
  require('colorscheme-picker').change 'catppuccin'
end, '[C]olorscheme [L]ight')
map_normal('<leader>cd', function()
  require('colorscheme-picker').change 'tokyodark'
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
