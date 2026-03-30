vim.pack.add {
  src = 'https://github.com/lervag/vimtex',
}

-- TODO: limit to  'tex', 'latex' types
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
require('vimtex').setup {}
