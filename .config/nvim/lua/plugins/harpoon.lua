return {
  'ThePrimeagen/harpoon',
  branch = 'harpoon2',
  lazy = true,
  event = { 'InsertEnter', 'BufWinEnter' },
  dependencies = { 'nvim-lua/plenary.nvim' },
  config = function(_, opts)
    require 'mappings.harpoon'
  end,
}
