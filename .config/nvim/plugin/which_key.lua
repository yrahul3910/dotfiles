vim.pack.add({{ -- Useful plugin to show you pending keybinds.
  src = 'https://github.com/folke/which-key.nvim'
}})

require('which-key').setup()

-- Document existing key chains
require('which-key').add {
  { '<leader>b', group = '[B]uffer' },
  { '<leader>D', group = '[D]ebug' },
  { '<leader>f', group = '[F]ind' },
  { '<leader>G', group = '[G]it Diffview' },
  { '<leader>g', group = '[G]it' },
  { '<leader>l', group = '[L]aTeX / [L]SP' },
  { '<leader>p', group = '[P]lugins' },
  { '<leader>r', group = '[R]ename' },
  { '<leader>s', group = '[S]ubstitute' },
  { '<leader>t', group = '[T]oggle / [T]est' },
  { '<leader>w', group = '[W]orkspace' },
  { '<leader>y', group = '[Y]ank' },
}
