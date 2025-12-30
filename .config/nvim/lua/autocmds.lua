-- Highlight when yanking (copying) text
--  See `:help vim.highlight.on_yank()`
vim.api.nvim_create_autocmd('TextYankPost', {
  desc = 'Highlight when yanking (copying) text',
  group = vim.api.nvim_create_augroup('kickstart-highlight-yank', { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})

-- Treat .pysh files as Python
vim.api.nvim_create_autocmd({ 'BufRead', 'BufNewFile' }, {
  pattern = '*.pysh',
  callback = function()
    vim.bo.filetype = 'python'
  end,
})

-- Restore cursor to last position when reopening a file
vim.api.nvim_create_autocmd('BufReadPost', {
  callback = function(args)
    local mark = vim.api.nvim_buf_get_mark(args.buf, '"')
    local line_count = vim.api.nvim_buf_line_count(args.buf)
    if mark[1] > 0 and mark[1] <= line_count then
      vim.cmd 'normal! g`"zz'
    end
  end,
})

local function has_value(tab, val)
  for key, _ in pairs(tab) do
    if key == val then
      return true
    end
  end

  return false
end

-- Show LSP signature when in insert mode and waiting, except for certain filetypes
vim.api.nvim_create_autocmd('CursorHoldI', {
  callback = function()
    local ignore_types = {
      'markdown',
      'conf',
      'fish',
      'toml',
      'json',
      'txt',
    }
    if has_value(ignore_types, vim.bo.filetype) then
      return
    end

    local clients = vim.lsp.get_clients()
    if clients == nil or #clients == 0 then
      return
    end

    local cur_client = clients[1]
    if cur_client:supports_method(vim.lsp.protocol.Methods.textDocument_signatureHelp) then
      vim.lsp.buf.signature_help {
        silent = true,
        focusable = false,
      }
    end
  end,
})

-- Fix window width for normal buffers
vim.api.nvim_create_autocmd('WinEnter', {
  callback = function()
    if vim.bo.buftype == '' then
      vim.wo.winfixwidth = true
    end
  end,
})
