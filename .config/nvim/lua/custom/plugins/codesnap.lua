return {
  'mistricky/codesnap.nvim',
  keys = {
    { '<leader>sc', '<Esc><cmd>CodeSnap<cr>', mode = 'x', desc = '[S]creenshot to [C]lipboard' },
    { '<leader>sf', '<Esc><cmd>CodeSnapSave<cr>', mode = 'x', desc = '[S]creenshot to [F]ile' },
  },
  opts = {
    save_path = '.',
    has_breadcrumbs = true,
    bg_theme = 'bamboo',
    watermark = '',
    bg_x_padding = 0,
    bg_y_padding = 0,
    has_line_number = true,
  },
  build = 'make',
}
