vim.pack.add { 'https://github.com/folke/snacks.nvim' }

require('snacks').setup(
  ---@type snacks.Config
  {
    input = { enabled = true },
    picker = {
      matcher = {
        frecency = true,
      },
    },
  }
)

local Snacks = require 'snacks'
local nmap = function(keys, func, desc)
  if desc then
    desc = 'Snacks: ' .. desc
  end

  vim.keymap.set('n', keys, func, { desc = desc })
end

nmap('<leader>ff', function()
  Snacks.picker.files()
end, '[F]ind [F]iles')
nmap('<leader>fg', function()
  Snacks.picker.grep()
end, '[F]ind by [G]rep')
nmap('<leader>fb', function()
  Snacks.picker.buffers {
    win = {
      input = {
        keys = {
          ['<C-d>'] = { 'bufdelete', mode = { 'n', 'i' } },
        },
      },
      list = { keys = { ['dd'] = 'bufdelete' } },
    },
  }
end, '[F]ind [B]uffers')
nmap('<leader>fh', function()
  Snacks.picker.help()
end, '[F]ind [H]elp')
nmap('<leader>fr', function()
  Snacks.picker.resume()
end, '[F]ind [R]esume')
nmap('<leader>gr', function()
  Snacks.picker.lsp_references()
end, '[G]o to [R]eferences')
nmap('<leader>gi', function()
  Snacks.picker.lsp_incoming_calls()
end, '[G]o to [I]ncoming calls')
nmap('<leader>go', function()
  Snacks.picker.lsp_outgoing_calls()
end, '[G]o to [O]utgoing calls')
nmap('<leader>ws', function()
  Snacks.picker.lsp_symbols()
end, '[W]orkspace [S]ymbols')
