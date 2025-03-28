local function reload_workspace()
  local filters = {
    bufnr = vim.api.nvim_get_current_buf(),
    name = 'rust_analyzer',
  }
  local clients = vim.lsp.get_clients(filters)

  for _, client in ipairs(clients) do
    vim.notify 'Reloading Cargo Workspace'
    client.request('rust-analyzer/reloadWorkspace', nil, function(err)
      if err then
        error(tostring(err))
      end
      vim.notify 'Cargo workspace reloaded'
    end, 0)
  end
end

return {
  cmd = { 'rust-analyzer' },
  filetypes = { 'rust' },
  root_markers = { 'Cargo.toml', '.git' },
  settings = {
    ['rust-analyzer'] = {
      checkOnSave = {
        command = 'clippy',
      },
    },
  },
  capabilities = {
    experimental = {
      serverStatusNotification = true,
    },
  },
  commands = {
    CargoReload = {
      function()
        reload_workspace()
      end,
      description = 'Reload current cargo workspace',
    },
  },
}
