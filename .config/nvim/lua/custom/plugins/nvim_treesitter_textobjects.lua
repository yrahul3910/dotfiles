return {
  'nvim-treesitter/nvim-treesitter-textobjects',
  lazy = true,
  event = { 'InsertEnter', 'BufWinEnter' },
  dependencies = { 'nvim-treesitter/nvim-treesitter' },
}
