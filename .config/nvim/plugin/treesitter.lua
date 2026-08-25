-- See `:h vim.pack-events`
local hooks = function(ev)
  -- Use available |event-data|
  local name, kind = ev.data.spec.name, ev.data.kind

  -- Run build script after plugin's code has changed
  if name == 'nvim-treesitter' and (kind == 'install' or kind == 'update') then
    -- Append `:wait()` if you need synchronous execution
    vim.cmd 'TSUpdate'
  end
end
vim.api.nvim_create_autocmd('PackChanged', { callback = hooks })

local ensure_installed = { 'bash', 'c', 'diff', 'html', 'lua', 'luadoc', 'markdown', 'markdown_inline', 'query', 'rust', 'vim', 'vimdoc', 'gitcommit' }

vim.pack.add {
  {
    src = 'https://github.com/nvim-treesitter/nvim-treesitter',
    version = 'main',
  },
  {
    src = 'https://github.com/MeanderingProgrammer/treesitter-modules.nvim',
  },
}

require('treesitter-modules').setup {
  auto_install = true,
  ensure_installed = ensure_installed,
  fold = { enable = true },
  highlight = { enable = true, disable = { 'latex' } },
  indent = { enable = true, disable = { 'ruby', 'python' } },
  incremental_selection = {
    enable = true,
    keymaps = {
      init_selection = '<A-o>',
      node_incremental = '<A-o>',
      node_decremental = '<A-i>',
    },
  },
}

vim.pack.add { 'https://github.com/nvim-treesitter/nvim-treesitter-context' }

require('treesitter-context').setup { max_lines = 5, separator = '-' }
