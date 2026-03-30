-- TODO: Refactor; this is also used in `luasnip.lua`
-- See `:h vim.pack-events`
local hooks = function(ev)
  -- Use available |event-data|
  local name, kind = ev.data.spec.name, ev.data.kind

  -- Run build script after plugin's code has changed
  if name == 'copilot.lua' and (kind == 'install' or kind == 'update') then
    -- Append `:wait()` if you need synchronous execution
    vim.cmd 'Copilot auth'
  end
end
vim.api.nvim_create_autocmd('PackChanged', { callback = hooks })

vim.pack.add {
  { src = 'https://github.com/giuxtaposition/blink-cmp-copilot' },
  {
    src = 'https://github.com/zbirenbaum/copilot.lua',
  },
}

if _G.myconfig.copilot_enabled then
  require('copilot.lua').setup {
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
end
