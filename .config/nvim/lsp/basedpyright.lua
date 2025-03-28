local function organize_imports()
  local params = {
    command = 'pyright.organizeimports',
    arguments = { vim.uri_from_bufnr(0) },
  }

  local filters = {
    bufnr = vim.api.nvim_get_current_buf(),
    name = 'pyright',
  }
  local clients = vim.lsp.get_clients(filters)

  for _, client in ipairs(clients) do
    client.request('workspace/executeCommand', params, nil, 0)
  end
end

local function set_python_path(path)
  local filters = {
    bufnr = vim.api.nvim_get_current_buf(),
    name = 'pyright',
  }
  local clients = vim.lsp.get_clients(filters)

  for _, client in ipairs(clients) do
    if client.settings then
      client.settings.python = vim.tbl_deep_extend('force', client.settings.python, { pythonPath = path })
    else
      client.config.settings = vim.tbl_deep_extend('force', client.config.settings, { python = { pythonPath = path } })
    end
    client.notify('workspace/didChangeConfiguration', { settings = nil })
  end
end

return {
  cmd = { 'basedpyright-langserver', '--stdio' },
  filetypes = { 'python' },
  root_markers = { '.git', 'setup.py', 'setup.cfg', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'pyrightconfig.json' },
  settings = {
    basedpyright = {
      analysis = {
        autoSearchPaths = true,
        useLibraryCodeForTypes = true,
        diagnosticMode = 'openFilesOnly',
        typeCheckingMode = 'basic',
      },
      autoImportCompletion = true,
    },
  },
  commands = {
    PyrightOrganizeImports = {
      organize_imports,
      description = 'Organize Imports',
    },
    PyrightSetPythonPath = {
      set_python_path,
      description = 'Reconfigure pyright with the provided python path',
      nargs = 1,
      complete = 'file',
    },
  },
}
