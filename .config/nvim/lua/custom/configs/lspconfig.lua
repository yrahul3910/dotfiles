-- Setup language servers.
local lspconfig = require('lspconfig')
lspconfig.pyright.setup {
  filetypes = { 'python', 'pysh' }
}
lspconfig.tsserver.setup {}
lspconfig.rust_analyzer.setup {
  -- Server-specific settings. See `:help lspconfig-setup`
  settings = {
    ['rust-analyzer'] = {},
  },
}
lspconfig.ruff_lsp.setup {}
lspconfig.sourcekit.setup {}
