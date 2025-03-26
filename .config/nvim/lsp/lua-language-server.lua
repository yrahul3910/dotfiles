return {
  cmd = { 'lua-language-server' },
  filetypes = { 'lua' },
  root_markers = { '.git', '.luarc.json' },
  settings = {
    Lua = {
      telemetry = {
        enable = false,
      },
    },
  },
}
