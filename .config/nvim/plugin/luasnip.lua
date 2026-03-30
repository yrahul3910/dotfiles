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

vim.pack.add {
  src = 'https://github.com/L3MON4D3/LuaSnip',
  version = 'v2.*',
}
require('luasnip.loaders.from_vscode').lazy_load {
  paths = { vim.fn.stdpath 'config' .. '/snippets' },
}
require('LuaSnip').setup {}
