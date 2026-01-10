if _G.myconfig.copilot_enabled then
  return {
    {
      'zbirenbaum/copilot.lua',
      cmd = 'Copilot',
      build = ':Copilot auth',
      lazy = false,
      config = function()
        require('copilot').setup {
          panel = {
            enabled = true,
            auto_refresh = true,
            keymap = {
              jump_prev = '[[',
              jump_next = ']]',
              accept = '<CR>',
              open = '<M-CR>',
            },
          },
          suggestion = {
            enabled = true,
            auto_trigger = true,
            accept = false, -- disable built-in keymapping
          },
          copilot_model = 'gpt-41-copilot',
        }
      end,
    },
    {
      'giuxtaposition/blink-cmp-copilot',
    },
    {
      'folke/sidekick.nvim',
      lazy = false,
      opts = {
        nes = {
          enabled = true,
        },
        cli = {
          mux = {
            backend = 'tmux',
            enabled = true,
          },
          copilot_model = 'gpt-41-copilot',
          prompts = {
            document = 'Add documentation to {function|line}, following the project standards',
            review = 'Can you review {file} for any issues or improvements?',
            tests = 'Can you write tests for {this}?',
            -- simple context prompts
            file = '{file}',
            line = '{line}',
            position = '{position}',
            selection = '{selection}',
          },
          -- preferred picker for selecting files
          ---@alias sidekick.picker "snacks"|"telescope"|"fzf-lua"
          picker = 'fzf-lua', ---@type sidekick.picker
        },
      },
      keys = {
        {
          '<Tab>',
          function()
            -- if there is a next edit, jump to it, otherwise apply it if any
            if not require('sidekick').nes_jump_or_apply() then
              return '<Tab>' -- fallback to normal tab
            end
          end,
          expr = true,
          desc = 'Goto/Apply Next Edit Suggestion',
        },
        {
          '<c-.>',
          function()
            require('sidekick.cli').toggle()
          end,
          desc = 'Sidekick Toggle',
          mode = { 'n', 't', 'i', 'x' },
        },
        {
          '<leader>sc',
          function()
            require('sidekick.cli').toggle()
          end,
          desc = '[S]idekick Toggle [C]LI',
        },
        {
          '<leader>sd',
          function()
            require('sidekick.cli').close()
          end,
          desc = '[S]idekick [D]etach CLI',
        },
        {
          '<leader>st',
          function()
            require('sidekick.cli').send { msg = '{this}' }
          end,
          mode = { 'x', 'n' },
          desc = '[S]idekick Send [T]his Line/Selection',
        },
        {
          '<leader>sf',
          function()
            require('sidekick.cli').send { msg = '{file}' }
          end,
          desc = '[S]idekick Send [F]ile',
        },
        {
          '<leader>sv',
          function()
            require('sidekick.cli').send { msg = '{selection}' }
          end,
          mode = { 'x' },
          desc = '[S]idekick Send [V]isual Selection',
        },
        {
          '<leader>sp',
          function()
            require('sidekick.cli').prompt()
          end,
          mode = { 'n', 'x' },
          desc = '[S]idekick Select [P]rompt',
        },
        -- Example of a keybinding to open Claude directly
        {
          '<leader>sC',
          function()
            require('sidekick.cli').toggle { name = 'claude', focus = true }
          end,
          desc = '[S]idekick Toggle [C]laude CLI',
        },
      },
    },
  }
else
  return {}
end
