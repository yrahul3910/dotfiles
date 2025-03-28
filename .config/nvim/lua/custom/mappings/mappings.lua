local map = function(defaults)
  local config = vim.tbl_deep_extend('force', { mode = {}, prefix = '', opts = {} }, defaults)
  return function(lhs, rhs, desc, opts)
    lhs = config.prefix .. lhs
    opts = opts or {}
    if type(desc) == 'table' then
      opts = desc
    else
      opts.desc = desc
    end
    opts = vim.tbl_deep_extend('force', config.opts, opts)
    vim.keymap.set(config.mode, lhs, rhs, opts)
  end
end

local nmap = map { mode = 'n' }
local vmap = map { mode = 'v' }

-- Custom
nmap('n', 'nzzzv', 'Next') -- From LazyVim, centers the screen after jumping
nmap('<leader>fc', '/<<<<CR>', '[F]ind [C]onflicts')
nmap('<leader>gcu', 'dd/|||<CR>0v/>>><CR>$x', '[G]it [C]onflict Choose [U]pstream (first)')
nmap('<leader>gcb', '0v/|||<CR>$x/====<CR>0v/>>><CR>$x', '[G]it [C]onflict Choose [B]ase (second)')
nmap('<leader>gcs', '0v/====<CR>$x/>>><CR>dd', '[G]it [C]onflict Choose [S]tashed (third)')

-- Diffview
nmap('<leader>Gd', '<cmd>DiffviewOpen<CR>', 'Open Diffview')
nmap('<leader>Gh', '<cmd>DiffviewFileHistory %<CR>', 'Open Diffview for file history')
nmap('<leader>tc', '<cmd>tabclose<CR>', '[T]ab [C]lose')

-- gitsigns
nmap('<leader>gw', '<cmd>Git blame --first-parent<CR>', '[G]it [W]ho')

-- Some mappings inspired by Helix (Kakoune mappings)
nmap('gh', '^', 'Move to first word') -- Somewhat different from helix
nmap('gl', '$b', 'Move to end of line')
nmap('ge', 'G', 'Move to end of file')

-- Convenience mappings
nmap('gb', 'kJi', 'Go back (to prev line)')
nmap('<leader>lr', ':LspRestart<CR>', '[L]SP [R]estart')
nmap('<leader>td', ':TodoFzfLua<CR>', '[T]odo [D]isplay')

-- Mappings from ThePrimeagen
-- Lets you move selected block around in visual mode
vmap('K', ":m '>+1<CR>gv=gv", 'Move selection down')
vmap('J', ":m '<-2<CR>gv=gv", 'Move selection up')

-- Keeps your cursor steady when moving up and down half-pages
nmap('<C-d>', '<C-d>zz', 'Move down half a page')
nmap('<C-u>', '<C-u>zz', 'Move up half a page')

nmap('Q', '<nop>')
nmap('<leader>xc', '<cmd>!chmod +x %<CR>', 'Make executable')
-- End Primeagen mappings

-- Swap j and k
nmap('gj', 'gk')
nmap('gk', 'gj')
nmap('<C-j>', '<C-w>k')
nmap('<C-k>', '<C-w>j')
vmap('j', 'k')
vmap('k', 'j')

nmap('k', "v:count == 0 ? 'gj' : 'j'", 'Go down', { expr = true })
nmap('j', "v:count == 0 ? 'gk' : 'k'", 'Go up', { expr = true })

-- Delete without copying
nmap('<leader>d', '"_d')
nmap('x', '"_x')
nmap('<leader>c', '"_c')
vmap('<leader>c', '"_c')
vmap('<leader>yc', '"+y', '[Y]ank to [C]lipboard')
nmap('<leader>yq', '"+yiq"', '[Y]ank [Q]uote')

-- fzf-lua
local fzf = require 'fzf-lua'

nmap('<leader>ff', fzf.files, '[F]ind [F]iles')
nmap('<leader>fg', fzf.live_grep_native, '[F]ind by [g]rep')
nmap('<leader>fG', fzf.live_grep, '[F]ind by grep with [G]lob')
nmap('<leader>fb', function()
  fzf.buffers { sort_mru = true, sort_lastused = true }
end, '[F]ind [B]uffers')
nmap('<leader>fh', fzf.helptags, '[F]ind [H]elp')
nmap('<leader>fr', '<cmd>FzfLua resume<CR>', '[F]ind [R]esume')
nmap('<leader>gr', fzf.lsp_references, '[G]o to [R]eferences')
nmap('<leader>ws', fzf.lsp_live_workspace_symbols, '[W]orkspace [S]ymbols')

-- nvim-tree
nmap('<C-s>', '<cmd>NvimTreeToggle<CR>', 'Toggle NvimTree')
nmap('<leader>ptr', '<cmd>NvimTreeRefresh<CR>', 'Refresh NvimTree')
nmap('<leader>ptm', '<cmd>NvimTreeResize -10<CR>', 'nvim-tree [m]inus')
nmap('<leader>ptp', '<cmd>NvimTreeResize +10<CR>', 'nvim-tree [p]lus')

-- aerial
nmap('<leader>a', '<cmd>AerialToggle!<CR>', 'Toggle Aerial window')

-- neotest
nmap('<leader>tr', function()
  require('neotest').run.run()
end, 'neotest: Run nearest')

nmap('<leader>tf', function()
  require('neotest').run.run(vim.fn.expand '%')
end, 'neotest: Test file')

nmap('<leader>to', function()
  require('neotest').output.open()
end, 'neotest: Open output')

-- toggleterm
function _G.set_terminal_keymaps()
  local opts = { buffer = 0 }
  vim.keymap.set('t', '<C-q>', [[<C-\><C-n><C-w>j]], opts)
end
vim.cmd 'autocmd! TermOpen term://* lua set_terminal_keymaps()'

-- copilot
if _G.myconfig.copilot then
  nmap(']c', require('copilot.suggestion').next(), '[C]opilot [N]ext')
  nmap('[c', require('copilot.suggestion').next(), '[C]opilot [P]revious')
end

-- bufferline + scope
nmap('<tab>', '<cmd>bnext<CR>', 'Next buffer')
nmap('<S-tab>', '<cmd>bprev<CR>', 'Previous buffer')
nmap('<leader>bc', '<cmd>bdelete<CR><cmd>bprevious<CR>', '[B]uffer [C]lose')

-- nvim-spider
vim.keymap.set({ 'n', 'o', 'x' }, 'W', '<cmd>lua require("spider").motion("w")<CR>', { desc = 'Spider-w' })
vim.keymap.set({ 'n', 'o', 'x' }, 'E', '<cmd>lua require("spider").motion("e")<CR>', { desc = 'Spider-e' })
vim.keymap.set({ 'n', 'o', 'x' }, 'B', '<cmd>lua require("spider").motion("b")<CR>', { desc = 'Spider-b' })

-- theme
nmap('<leader>cl', function()
  vim.cmd 'colorscheme catppuccin'
end, '[C]olorscheme [L]ight')
nmap('<leader>cd', function()
  vim.cmd 'colorscheme arctic'
end, '[C]olorscheme [D]ark')

-- custom workflows
local function copy_git_file_path()
  local base_url = vim.fn.system('git remote get-url origin'):gsub('%s+$', '')

  if vim.v.shell_error ~= 0 then
    local file_path = vim.fn.expand '%:p'
    vim.fn.setreg('+', file_path)
    return
  end

  -- Normalize SSH URLs to HTTPS
  base_url = base_url:gsub('git@github.com:', 'https://github.com/')
  base_url = base_url:gsub('%.git$', '')

  local file_path = vim.fn.expand '%:p'
  local git_root = vim.fn.system('git rev-parse --show-toplevel'):gsub('%s+$', '')
  local relative_path = file_path:sub(#git_root + 1)
  local branch = vim.fn.system('git rev-parse --abbrev-ref HEAD 2> /dev/null'):gsub('%s+$', '')

  local full_url

  if base_url:find 'github' then
    full_url = base_url .. '/blob/' .. branch .. relative_path
  elseif base_url:find 'visualstudio.com' then
    full_url = base_url .. '?path=' .. relative_path .. '&version=GB' .. branch
  end

  vim.fn.setreg('+', full_url)
end

nmap('<leader>yf', copy_git_file_path, '[Y]ank [F]ilename')

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
-- nmap('<LeftMouse>', '<cmd>lua totally_harmless_dont_worry()<CR>')
