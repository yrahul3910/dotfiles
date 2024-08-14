return {
  { 'neoclide/coc.nvim', branch = 'master', run = 'yarn install --frozen-lockfile' },
  {
    'neoclide/coc-tsserver',
    dependencies = {
      'neoclide/coc.nvim',
    },
  },
  {
    'neoclide/coc-prettier',
    dependencies = {
      'neoclide/coc.nvim',
    },
  },
  {
    'fannheyward/coc-pyright',
    dependencies = {
      'neoclide/coc.nvim',
    },
  },
}
