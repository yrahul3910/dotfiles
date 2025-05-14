return {
  'stevearc/aerial.nvim',
  lazy = true,
  event = { 'BufWinEnter' },
  opts = {},
  -- Optional dependencies
  dependencies = {
    'nvim-treesitter/nvim-treesitter',
    'nvim-tree/nvim-web-devicons',
  },
  config = function()
    require('aerial').setup {
      on_attach = function(bufnr)
        -- Jump forwards/backwards with '{' and '}'
        vim.keymap.set('n', '{', '<cmd>AerialPrev<CR>', { buffer = bufnr })
        vim.keymap.set('n', '}', '<cmd>AerialNext<CR>', { buffer = bufnr })
      end,

      backends = { 'treesitter', 'lsp', 'markdown', 'asciidoc', 'man' },
      layout = {
        max_width = { 25, 0.15 },
        min_width = 10,

        default_direction = 'right',
        placement = 'edge',
        resize_to_content = true,
        preserve_equality = true,
      },

      attach_mode = 'window',
      disable_max_lines = 50000,

      keymaps = {
        ['?'] = 'actions.show_help',
        ['<CR>'] = 'actions.jump',
        ['<2-LeftMouse>'] = 'actions.jump',
        ['{'] = 'actions.prev',
        ['}'] = 'actions.next',
        ['q'] = 'actions.close',
        ['o'] = 'actions.tree_toggle',
        ['za'] = 'actions.tree_toggle',
        ['zA'] = 'actions.tree_toggle_recursive',
      },

      filter_kind = {
        'Class',
        'Constructor',
        'Enum',
        'Function',
        'Interface',
        'Method',
        'Struct',
      },
    }
  end,
}
