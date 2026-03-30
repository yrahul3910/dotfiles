vim.pack.add {
  src = 'folke/snacks.nvim',
  priority = 1000,
}

require('snacks.nvim').setup(
  ---@type snacks.Config
  {
    input = { enabled = true },
    picker = {},
  }
)
