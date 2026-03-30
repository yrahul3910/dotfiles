vim.pack.add {
  { src = 'https://github.com/nvim-lua/plenary.nvim' },
  { src = 'https://github.com/neovim/nvim-lspconfig' },
  {
    src = 'https://github.com/pmizio/typescript-tools.nvim',
  },
}

require('typescript-tools.nvim').setup {}
