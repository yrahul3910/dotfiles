if _G.myconfig.copilot_enabled then
  return {
    {
      'zbirenbaum/copilot.lua',
      cmd = 'Copilot',
      build = ':Copilot auth',
      lazy = true,
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
        }
      end,
    },
    {
      'giuxtaposition/blink-cmp-copilot',
    },
    {
      'folke/sidekick.nvim',
      opts = {
        nes = {
          enabled = function(buf)
            return vim.g.sidekick_nes ~= false and vim.b.sidekick_nes ~= false
          end,
          debounce = 50,
          trigger = {
            -- events that trigger sidekick next edit suggestions
            events = { 'CursorHoldI', 'ModeChanged i:n', 'TextChanged', 'TextChangedI', 'User SidekickNesDone' },
          },
          clear = {
            -- events that clear the current next edit suggestion
            events = { 'InsertEnter' },
            esc = true, -- clear next edit suggestions when pressing <Esc>
          },
          ---@class sidekick.diff.Opts
          ---@field inline? "words"|"chars"|false Enable inline diffs
          diff = {
            inline = 'words',
          },
        },
        cli = {
          mux = {
            backend = 'tmux',
            enabled = true,
          },
          prompts = {
            document = 'Add documentation to {function|line} following the project standards',
            fix = 'Can you fix {this}?',
            tests = 'Can you write tests for {this}?',
            file = '{file}',
            selection = '{selection}',
            ['function'] = '{function}',
          },
        },
      },
      keys = {
        {
          '<S-Tab>',
          function()
            -- if there is a next edit, jump to it, otherwise apply it if any
            if not require('sidekick').nes_jump_or_apply() then
              return
            end
          end,
          mode = { 'i', 'n' },
          expr = true,
          desc = 'Goto/Apply Next Edit Suggestion',
        },
        {
          '<c-;>',
          function()
            require('sidekick.cli').toggle()
          end,
          desc = 'Sidekick Toggle',
          mode = { 'n', 't', 'i', 'x' },
        },
        {
          '<leader>st',
          function()
            require('sidekick.cli').toggle()
          end,
          desc = '[S]idekick [T]oggle CLI',
        },
        {
          '<leader>sc',
          function()
            require('sidekick.cli').select()
          end,
          -- Or to select only installed tools:
          -- require("sidekick.cli").select({ filter = { installed = true } })
          desc = '[S]idekick Select [C]LI',
        },
        {
          '<leader>sd',
          function()
            require('sidekick.cli').close()
          end,
          desc = 'Detach a CLI Session',
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
        {
          '<leader>sC',
          function()
            require('sidekick.cli').toggle { name = 'claude', focus = true }
          end,
          desc = '[S]idekick Toggle [C]laude',
        },
      },
    },
  }
else
  return {}
end
