-- Setup language servers.
local lspconfig = require('lspconfig')
local util = require('lspconfig.util')

lspconfig.pyright.setup {
  filetypes = { 'python', 'pysh' },
  root_dir = function(fname)
    return util.root_pattern("pyrightconfig.json")(fname) or
      util.path.dirname(fname)
  end,
  settings = {
    pyright = {
      autoImportCompletion = true
    },
    python = {
      analysis = {
        autoSearchPaths = true,
        diagnosticMode = 'openFilesOnly',
        useLibraryForCodeTypes = true
      }
    }
  },
  single_file_support = true
}
lspconfig.tsserver.setup {}
lspconfig.rust_analyzer.setup {
  -- Server-specific settings. See `:help lspconfig-setup`
  settings = {
    ['rust-analyzer'] = {
      checkOnSave = {
        command = 'clippy'
      }
    },
  },
}
lspconfig.sourcekit.setup {}
