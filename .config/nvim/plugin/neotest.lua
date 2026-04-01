vim.pack.add {
  {
    src = 'https://github.com/nvim-neotest/neotest-python',
  },
  {
    src = 'https://github.com/nvim-neotest/neotest-plenary',
  },
  {
    src = 'https://github.com/nvim-neotest/nvim-nio',
  },
  {
    src = 'https://github.com/nvim-lua/plenary.nvim',
  },
  {
    src = 'https://github.com/antoinemadec/FixCursorHold.nvim',
  },
  {
    src = 'https://github.com/nvim-treesitter/nvim-treesitter',
  },
  {
    src = 'https://github.com/nvim-neotest/neotest',
  },
}

require('neotest').setup {
  adapters = {
    require 'neotest-python' {
      args = { '-vv' },
    },
    require 'neotest-plenary',
  },
}
