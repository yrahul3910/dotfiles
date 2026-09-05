vim.pack.add { 'https://github.com/stevearc/conform.nvim' }

require('conform').setup {
  notify_on_error = false,
  format_on_save = function(bufnr)
    -- Disable "format_on_save lsp_fallback" for languages that don't
    -- have a well standardized coding style. You can add additional
    -- languages here or re-enable it for the disabled ones.
    local disable_filetypes = { c = true, cpp = true }

    if disable_filetypes[vim.bo[bufnr].filetype] then
      return nil
    else
      return {
        timeout_ms = 4000,
        lsp_format = 'fallback',
      }
    end
  end,
  formatters_by_ft = {
    lua = { 'stylua' },
    javascript = { 'prettier', stop_after_first = true },
    typescript = { 'prettier', 'biome', stop_after_first = true },
    typescriptreact = { 'prettier', 'biome', stop_after_first = true },
    python = { 'black', 'ruff_format', stop_after_first = true },
    json = { 'prettier', stop_after_first = false },
    jsonc = { 'prettier', stop_after_first = false },
    c = { 'clang-format', stop_after_first = true },
    cpp = { 'clang-format', stop_after_first = true },
  },
}
