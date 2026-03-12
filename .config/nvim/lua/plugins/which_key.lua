return { -- Useful plugin to show you pending keybinds.
  'folke/which-key.nvim',
  event = 'VimEnter', -- Sets the loading event to 'VimEnter'
  config = function() -- This is the function that runs, AFTER loading
    require('which-key').setup()

    -- Document existing key chains
    require('which-key').add {
      { '<leader>a', group = '[A]I' },
      { '<leader>b', group = '[B]uffer' },
      { '<leader>D', group = '[D]ebug' },
      { '<leader>f', group = '[F]ind' },
      { '<leader>G', group = '[G]it Diffview' },
      { '<leader>g', group = '[G]it' },
      { '<leader>l', group = '[L]aTeX / [L]SP' },
      { '<leader>p', group = '[P]lugins' },
      { '<leader>r', group = '[R]ename' },
      { '<leader>s', group = '[S]ubstitute' },
      { '<leader>t', group = '[T]oggle / [T]est' },
      { '<leader>w', group = '[W]orkspace' },
      { '<leader>y', group = '[Y]ank' },
    }
  end,
}
