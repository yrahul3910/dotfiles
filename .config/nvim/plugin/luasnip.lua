-- See `:h vim.pack-events`
local hooks = function(ev)
  -- Use available |event-data|
  local name, kind = ev.data.spec.name, ev.data.kind

  -- Run build script after plugin's code has changed
  if name == 'LuaSnip' and (kind == 'install' or kind == 'update') then
    -- Append `:wait()` if you need synchronous execution
    vim.system({ 'make' }, { cwd = ev.data.path })
  end
end
vim.api.nvim_create_autocmd('PackChanged', { callback = hooks })

vim.pack.add({{
  src = 'https://github.com/L3MON4D3/LuaSnip',
  version = 'v2.4.1',
}})
require('luasnip.loaders.from_vscode').lazy_load {
  paths = { vim.fn.stdpath 'config' .. '/snippets' },
}
require('LuaSnip').setup {}

local luasnip = require 'luasnip'

local imap = function(keys, func, desc)
  if desc then
    desc = 'LuaSnip: ' .. desc
  end

  vim.keymap.set('i', keys, func, { desc = desc })
end

local ismap = function(keys, func, desc)
  if desc then
    desc = 'LuaSnip: ' .. desc
  end

  vim.keymap.set({ 'i', 's' }, keys, func, { desc = desc })
end

imap('<C-k>', function()
  if luasnip.expand_or_jumpable() then
    luasnip.expand_or_jump()
  end
end, 'Expand snippet')
ismap('<C-h>', function()
  luasnip.jump(-1)
end, 'Snippet: jump back')
ismap('<C-l>', function()
  luasnip.jump(1)
end, 'Snippet: jump forward')
ismap('<C-e>', function()
  if luasnip.choice_active() then
    luasnip.change_choice(1)
  end
end, 'Snippet: change active choice')
