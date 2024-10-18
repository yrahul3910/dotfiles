return {
  'otavioschwanck/arrow.nvim',
  dependencies = {
    { 'nvim-tree/nvim-web-devicons' },
    -- or if using `mini.icons`
    -- { "echasnovski/mini.icons" },
  },
  opts = {
    show_icons = false,
    leader_key = ';', -- Recommended to be a single key
    separate_by_branch = false,
    mappings = {
      edit = 'e',
      delete_mode = 'd',
      clear_all_items = 'C',
      toggle = 's', -- used as save if separate_save_and_remove is true
      open_vertical = 'v',
      open_horizontal = '-',
      quit = 'q',
      remove = 'x', -- only used if separate_save_and_remove is true
      next_item = 'k',
      prev_item = 'j',
    },
    buffer_leader_key = 'm', -- Per Buffer Mappings
  },
}
