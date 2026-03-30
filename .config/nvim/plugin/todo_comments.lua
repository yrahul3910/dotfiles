-- Highlight todo, notes, etc in comments
vim.pack.add({ {
  src = 'https://github.com/nvim-lua/plenary.nvim',
}, {
  src = 'https://github.com/folke/todo-comments.nvim',
} })

require('todo-comments').setup {
  opts = { signs = false },
}
