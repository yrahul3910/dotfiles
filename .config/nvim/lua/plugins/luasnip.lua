return {
  'L3MON4D3/LuaSnip',
  version = 'v2.*',
  build = 'make install_jsregexp',
  -- `friendly-snippets` contains a variety of premade snippets.
  --    See the README about individual language/framework/plugin snippets:
  --    https://github.com/rafamadriz/friendly-snippets
  -- {
  --   'rafamadriz/friendly-snippets',
  --   config = function()
  --     require('luasnip.loaders.from_vscode').lazy_load()
  --   end,
  -- },
  config = function()
    require('luasnip.loaders.from_vscode').lazy_load {
      paths = { vim.fn.stdpath 'config' .. '/snippets' },
    }
  end,
}
