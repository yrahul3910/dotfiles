vim.pack.add({ 'https://github.com/lervag/vimtex' })

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
