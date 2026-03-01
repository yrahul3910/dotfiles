local ensure_installed = { 'bash', 'c', 'diff', 'html', 'lua', 'luadoc', 'markdown', 'markdown_inline', 'query', 'rust', 'vim', 'vimdoc', 'gitcommit' }
return {
  {
    'nvim-treesitter/nvim-treesitter',
    lazy = false,
    branch = 'main',
    build = ':TSUpdate',
    -- NOTE: The config here works for auto-installing tree-sitter parsers, but there isn't native support yet
    -- for incremental section, so we use the plugin at the bottom instead.
    --
    -- config = function()
    --   local parsers = { 'bash', 'c', 'diff', 'html', 'lua', 'luadoc', 'markdown', 'markdown_inline', 'query', 'rust', 'vim', 'vimdoc', 'gitcommit' }
    --
    --   require('nvim-treesitter').install(parsers)
    --   vim.api.nvim_create_autocmd('FileType', {
    --     callback = function(args)
    --       local buf, filetype = args.buf, args.match
    --
    --       local language = vim.treesitter.language.get_lang(filetype)
    --       if not language then
    --         return
    --       end
    --
    --       -- check if parser exists and load it
    --       if not vim.treesitter.language.add(language) then
    --         return
    --       end
    --       -- enables syntax highlighting and other treesitter features
    --       vim.treesitter.start(buf, language)
    --
    --       -- enables treesitter based folds
    --       -- for more info on folds see `:help folds`
    --       -- vim.wo.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
    --       -- vim.wo.foldmethod = 'expr'
    --
    --       -- enables treesitter based indentation
    --       vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
    --     end,
    --   })
    -- end,
  },
  {
    'MeanderingProgrammer/treesitter-modules.nvim',
    dependencies = { 'nvim-treesitter/nvim-treesitter' },
    opts = {
      auto_install = true,
      ensure_installed = ensure_installed,
      fold = { enable = true },
      highlight = { enable = true, disable = { 'latex' } },
      indent = { enable = true, disable = { 'ruby', 'python' } },
      incremental_selection = {
        enable = true,
        keymaps = {
          init_selection = '<A-o>',
          node_incremental = '<A-o>',
          node_decremental = '<A-i>',
        },
      },
    },
  },
}
