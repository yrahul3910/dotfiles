return {
  'nvim-treesitter/nvim-treesitter-context',
  lazy = true,
  event = { 'InsertEnter', 'BufWinEnter' },
  dependencies = { 'nvim-treesitter/nvim-treesitter' },
  opts = {
    max_lines = 5,
  },
}
