return {
  'nvim-treesitter/nvim-treesitter',
  lazy = false,
  branch = 'main',
  version = false,
  build = ':TSUpdate',
  config = function()
    local TS = require 'nvim-treesitter'
    if not TS.get_installed then
      vim.notify 'Please check `package-lock.json` to ensure `nvim-treesitter` is on the **main** branch.'
      return
    end
    local parser_installed = {
      'python',
      'go',
      'c',
      'lua',
      'vim',
      'vimdoc',
      'query',
      'markdown_inline',
      'markdown',
    }

    vim.defer_fn(function()
      require('nvim-treesitter').install(parser_installed)
    end, 1000)

    -- auto-start highlights & indentation
    vim.api.nvim_create_autocmd('FileType', {
      desc = 'User: enable treesitter highlighting',
      callback = function(ctx)
        -- highlights
        local hasStarted = pcall(vim.treesitter.start) -- errors for filetypes with no parser

        -- indent
        local noIndent = {}
        if hasStarted and not vim.list_contains(noIndent, ctx.match) then
          vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
        end
      end,
    })
  end,
}
