return {
  'catppuccin/nvim',
  event = 'VeryLazy',
  version = '1.11.0',
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
      },
      background = {
        light = 'latte',
        dark = 'latte',
      },
    }
  end,
}
