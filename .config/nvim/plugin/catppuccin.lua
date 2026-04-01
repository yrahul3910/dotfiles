vim.pack.add { {
  src = 'https://github.com/catppuccin/nvim',
  name = 'catppuccin',
  version = 'v1.11.0',
} }

require('catppuccin').setup {
  flavor = 'mocha',
  integrations = {
    aerial = true,
    blink_cmp = true,
    diffview = true,
    fidget = true,
    fzf = true,
    indent_blankline = true,
  },
  background = {
    light = 'latte',
    dark = 'mocha',
  },
}

vim.cmd 'colorscheme catppuccin-mocha'
