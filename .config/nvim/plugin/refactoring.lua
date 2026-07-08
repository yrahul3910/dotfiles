vim.pack.add {
  'https://github.com/lewis6991/async.nvim',
  'https://github.com/theprimeagen/refactoring.nvim',
}

vim.keymap.set({ 'n', 'x' }, '<leader>rf', function()
  -- this keymap doesn't select any textobject by default, so you may need to provide one each time you use it.
  require('refactoring').select_refactor()
end, { desc = '[R]e[f]actor' })

vim.keymap.set({ 'n', 'x' }, '<leader>ri', function()
  return require('refactoring').inline_var()
end, { desc = '[R]efactor: [I]nline variable', expr = true })
