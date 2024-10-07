return {
  {
    'nvim-neotest/neotest-python',
  },
  {
    'nvim-neotest/neotest-plenary',
  },
  {
    'nvim-neotest/neotest',
    lazy = false,
    dependencies = {
      'nvim-neotest/nvim-nio',
      'nvim-lua/plenary.nvim',
      'antoinemadec/FixCursorHold.nvim',
      'nvim-treesitter/nvim-treesitter',
    },
    config = function()
      require('neotest').setup {
        adapters = {
          require 'neotest-python' {
            args = { '-vv' },
          },
          require 'neotest-plenary',
        },
      }
    end,
  },
}
