return {
  'ThePrimeagen/harpoon',
  branch = 'harpoon2',
  lazy = false,
  dependencies = { 'nvim-lua/plenary.nvim' },
  config = function(_, opts)
    require 'custom.mappings.harpoon'
  end,
}
