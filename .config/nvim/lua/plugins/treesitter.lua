local ensure_installed = { 'bash', 'c', 'diff', 'html', 'lua', 'luadoc', 'markdown', 'markdown_inline', 'query', 'vim', 'vimdoc', 'gitcommit' }

return {
  {
    'nvim-treesitter/nvim-treesitter',
    branch = 'main',
    build = ':TSUpdate',
  },
  {
    'MeanderingProgrammer/treesitter-modules.nvim',
    dependencies = { 'nvim-treesitter/nvim-treesitter' },
    opts = {
      ensure_installed = ensure_installed,
      fold = { enable = true },
      highlight = { enable = true, disable = { 'latex' } },
      indent = { enable = true, disable = { 'ruby', 'python' } },
      incremental_selection = { enable = true },
    },
  },
}
