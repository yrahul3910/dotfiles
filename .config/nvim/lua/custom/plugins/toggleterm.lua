return {
  'akinsho/toggleterm.nvim',
  lazy = false,
  config = function()
    require('toggleterm').setup {
      size = 20,
      open_mapping = [[<C-\>]],
      hide_numbers = false,
      autochdir = true,
      insert_mappings = true,
      terminal_mappings = false,
      persist_size = true,
      persist_mode = true,
      direction = 'float',
      close_on_exit = true,
      shell = 'zsh',
      auto_scroll = true,
      float_opts = {
        border = 'single',
        title_pos = 'left',
      },
    }
  end,
}
