return {
  'nvim-treesitter/nvim-treesitter-textobjects',
  branch = 'master',
  lazy = true,
  event = { 'InsertEnter', 'BufWinEnter' },
  dependencies = { 'nvim-treesitter/nvim-treesitter' },
}
