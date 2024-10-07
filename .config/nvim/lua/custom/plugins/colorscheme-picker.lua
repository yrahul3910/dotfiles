local os = require 'os'

return {
  'runih/colorscheme-picker.nvim',
  dependencies = {
    'nvim-telescope/telescope.nvim',
  },
  config = function()
    local time = os.date '*t'
    local hour = time.hour

    local ok, colorscheme = pcall(require, 'colorscheme-picker')
    if not ok then
      print 'Color Picker is not loaded'
      return
    end
    colorscheme.setup {
      default_colorscheme = (hour >= 8 and hour <= 18) and 'catppuccin-latte' or 'onedark',
      keymapping = '<leader>cs',
    }
    colorscheme.set_default_colorscheme()
  end,
}
