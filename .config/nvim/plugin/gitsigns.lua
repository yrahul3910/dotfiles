-- Adds git related signs to the gutter, as well as utilities for managing changes
vim.pack.add {
  src = 'https://github.com/lewis6991/gitsigns.nvim',
  version = '1.0.1',
}

require('gitsigns.nvim').setup {
  signs = {
    add = { text = '+' },
    change = { text = '~' },
    delete = { text = '_' },
    topdelete = { text = '‾' },
    changedelete = { text = '~' },
  },
}
