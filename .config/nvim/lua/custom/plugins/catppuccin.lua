return {
  'catppuccin/nvim',
  config = function()
    require('catppuccin').setup {
      flavor = 'latte',
      background = {
        light = 'latte',
        dark = 'latte',
      },
    }
  end,
}
