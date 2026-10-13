-- Adds git related signs to the gutter, as well as utilities for managing changes
vim.pack.add { 'https://github.com/lewis6991/gitsigns.nvim' }

require('gitsigns').setup {
  watch_gitdir = { enable = false },
  signs = {
    add = { text = '+' },
    change = { text = '~' },
    delete = { text = '_' },
    topdelete = { text = '‾' },
    changedelete = { text = '~' },
  },
  on_attach = function(bufnr)
    local gitsigns = require 'gitsigns'

    vim.keymap.set('n', ']h', function()
      gitsigns.nav_hunk 'next'
    end, { buffer = bufnr, desc = 'Next Git hunk' })

    vim.keymap.set('n', '[h', function()
      gitsigns.nav_hunk 'prev'
    end, { buffer = bufnr, desc = 'Previous Git hunk' })
  end,
}
