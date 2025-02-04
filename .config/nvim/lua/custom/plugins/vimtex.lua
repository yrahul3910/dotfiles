return {
  'lervag/vimtex',
  ft = { 'tex', 'latex' },
  -- tag = "v2.15", -- uncomment to pin to a specific release
  init = function()
    vim.g.vimtex_compiler_method = 'latexmk'
  end,
}
