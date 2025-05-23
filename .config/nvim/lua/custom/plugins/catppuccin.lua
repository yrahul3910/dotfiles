return {
  'catppuccin/nvim',
  event = 'VeryLazy',
  config = function()
    require('catppuccin').setup {
      flavor = 'latte',
      integrations = {
        aerial = true,
        blink_cmp = true,
        diffview = true,
        fidget = true,
        fzf = true,
        indent_blankline = true,
        markview = true,
      },
      background = {
        light = 'latte',
        dark = 'latte',
      },
    }
  end,
}
