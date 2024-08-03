return {
  'catppuccin/nvim',
  name = 'catppuccin',
  priority = 1000,
  opts = {
    flavor = 'latte',
    background = {
      light = 'latte',
      dark = 'latte',
    },
    transparent_background = false,
    integrations = {
      aerial = true,
      alpha = true,
      bufferline = true,
      gitsigns = true,
      mason = true,
      neotest = true,
      cmp = true,
    },
  },
}
