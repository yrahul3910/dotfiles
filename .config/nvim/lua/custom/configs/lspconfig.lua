-- Setup language servers.
local lspconfig = require('lspconfig')
-- lspconfig.pyright.setup {
--   filetypes = { 'python', 'pysh' },
--   root_dir = function()
--     return vim.fn.getcwd()
--   end
-- }
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
lspconfig.ruff_lsp.setup {}
lspconfig.sourcekit.setup {}
