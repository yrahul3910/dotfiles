-- Highlight when yanking (copying) text
--  See `:help vim.highlight.on_yank()`
vim.api.nvim_create_autocmd('TextYankPost', {
  desc = 'Highlight when yanking (copying) text',
  group = vim.api.nvim_create_augroup('kickstart-highlight-yank', { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})

-- Automatically change quickscope highlight colors based on the current theme's background (dark or light).
vim.api.nvim_create_augroup('qs_colors', { clear = true })
vim.api.nvim_create_autocmd('ColorScheme', {
  group = 'qs_colors',
  pattern = '*', -- Matches any theme
  callback = function()
    -- Check the current background determined by the theme or terminal
    local is_dark = vim.o.background == 'dark'

    if is_dark then
      vim.api.nvim_set_hl(0, 'QuickScopePrimary', {
        fg = '#afff5f',
        bold = true,
        nocombine = true,
        ctermfg = 155,
        cterm = { bold = true },
      })
      vim.api.nvim_set_hl(0, 'QuickScopeSecondary', {
        fg = '#d7afff',
        underline = true,
        nocombine = true,
        ctermfg = 81,
        cterm = { underline = true },
      })
    else
      -- Light theme
      vim.api.nvim_set_hl(0, 'QuickScopePrimary', {
        fg = '#005f00', -- dark green
        bold = true,
        nocombine = true,
        ctermfg = 22, -- approximate dark green
        cterm = { bold = true },
      })
      vim.api.nvim_set_hl(0, 'QuickScopeSecondary', {
        fg = '#5f0087', -- dark teal/blue
        underline = true,
        nocombine = true,
        ctermfg = 24, -- approximate dark blue
        cterm = { underline = true },
      })
    end

    -- 2. Apply highlights that should be exactly the same regardless of light/dark
    vim.api.nvim_set_hl(0, 'SomeGenericGroup', { underline = true })
  end,
})

-- LSP progress bar in ghostty/iTerm/GNOME terminal/etc. that support OSC 9;4.
-- See: https://www.reddit.com/r/neovim/comments/1rcvliq/ghostty_lsp_progress_bar/o73wdkc/
vim.api.nvim_create_autocmd('LspProgress', {
  callback = function(ev)
    local value = ev.data.params.value or {}
    if not value.kind then
      return
    end

    local status = value.kind == 'end' and 0 or 1
    local percent = value.percentage or 0

    local osc_seq = string.format('\27]9;4;%d;%d\a', status, percent)

    if os.getenv 'TMUX' then
      osc_seq = string.format('\27Ptmux;\27%s\27\\', osc_seq)
    end

    io.stdout:write(osc_seq)
    io.stdout:flush()
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

    local clients = vim.lsp.get_clients { bufnr = 0 }
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
