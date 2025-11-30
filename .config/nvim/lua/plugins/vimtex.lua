return {
  'lervag/vimtex',
  ft = { 'tex', 'latex' },
  -- tag = "v2.15", -- uncomment to pin to a specific release
  init = function()
    vim.g.vimtex_compiler_method = 'latexmk'
    vim.g.vimtex_indent_lists = {}
    vim.g.vimtex_compiler_latexmk = {
      options = {
        '-shell-escape',
        '-verbose',
        '-file-line-error',
        '-synctex=1',
        '-interaction=nonstopmode',
      },
      ignore_additional = { 'svg-inkscape/' },
    }
  end,
}
