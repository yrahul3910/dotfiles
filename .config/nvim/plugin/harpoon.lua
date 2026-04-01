vim.pack.add { {
  src = 'https://github.com/nvim-lua/plenary.nvim',
}, {
  src = 'https://github.com/ThePrimeagen/harpoon',
  version = 'harpoon2',
} }

require('harpoon').setup {}
require 'mappings.harpoon'
