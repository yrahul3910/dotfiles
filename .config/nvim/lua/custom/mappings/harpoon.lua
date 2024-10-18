local harpoon = require 'harpoon'
local conf = require('telescope.config').values

harpoon:setup {
  settings = {
    sync_on_ui_close = true,
    save_on_toggle = true,
  },
}

local function map_normal(keys, mapping, desc)
  vim.keymap.set('n', keys, mapping, { desc = desc, noremap = true, silent = true })
end

map_normal('<leader>pha', function()
  harpoon:list():add()
end, 'Harpoon2: add')

map_normal('<leader>phd', function()
  harpoon:list():remove()
end, 'Harpoon2: remove')

map_normal('<leader>pho', function()
  harpoon.ui:toggle_quick_menu(harpoon:list())
end, 'Harpoon2: open')

map_normal('<C-v>', function()
  harpoon:list():select(1)
end, '')
map_normal('<C-b>', function()
  harpoon:list():select(2)
end, '')
map_normal('<C-n>', function()
  harpoon:list():select(3)
end, '')
map_normal('<C-m>', function()
  harpoon:list():select(4)
end, '')
