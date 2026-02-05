return {
  'sindrets/diffview.nvim',
  lazy = true,
  event = { 'BufWinEnter' },
  config = function()
    local actions = require 'diffview.actions'
    require('diffview').setup {
      enhanced_diff_hl = true,
      keymaps = {
        disable_defaults = true,
        file_panel = {
          { 'n', 'k', actions.next_entry, { desc = 'Bring the cursor to the next file entry' } },
          { 'n', 'j', actions.prev_entry, { desc = 'Bring the cursor to the previous file entry' } },
          { 'n', 's', actions.toggle_stage_entry, { desc = 'Stage / unstage the selected entry' } },
          { 'n', '<up>', actions.prev_entry, { desc = 'Bring the cursor to the previous file entry' } },
          { 'n', '<down>', actions.next_entry, { desc = 'Bring the cursor to the next file entry' } },
          { 'n', '<cr>', actions.select_entry, { desc = 'Open the diff for the selected entry' } },
          { 'n', 'zo', actions.open_fold, { desc = 'Expand fold' } },
          { 'n', 'zc', actions.close_fold, { desc = 'Collapse fold' } },
          { 'n', 'zR', actions.open_all_folds, { desc = 'Expand all folds' } },
          { 'n', 'zM', actions.close_all_folds, { desc = 'Collapse all folds' } },
          { 'n', 'g?', actions.help 'file_panel', { desc = 'Open the help panel' } },
        },
        file_history_panel = {
          { 'n', '<C-A-d>', actions.open_in_diffview, { desc = 'Open the entry under the cursor in a diffview' } },
          { 'n', 'y', actions.copy_hash, { desc = 'Copy the commit hash of the entry under the cursor' } },
          { 'n', 'L', actions.open_commit_log, { desc = 'Show commit details' } },
          { 'n', '<C-x>', actions.restore_entry, { desc = 'Restore file to the state from the selected entry' } },
          { 'n', 'k', actions.next_entry, { desc = 'Bring the cursor to the next file entry' } },
          { 'n', 'j', actions.prev_entry, { desc = 'Bring the cursor to the previous file entry' } },
          { 'n', '<cr>', actions.select_entry, { desc = 'Open the diff for the selected entry' } },
          { 'n', 'g?', actions.help 'file_history_panel', { desc = 'Open the help panel' } },
        },
        option_panel = {
          { 'n', 'g?', actions.help 'option_panel', { desc = 'Open the help panel' } },
          { 'n', 'q', actions.close, { desc = 'Close the panel' } },
        },
        help_panel = {
          { 'n', 'q', actions.close, { desc = 'Close help menu' } },
          { 'n', '<esc>', actions.close, { desc = 'Close help menu' } },
        },
        diff2 = {
          -- Mappings in 2-way diff layouts
          { 'n', 'g?', actions.help { 'view', 'diff2' }, { desc = 'Open the help panel' } },
        },
      },
    }
  end,
}
