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
  }
else
  return {}
end
