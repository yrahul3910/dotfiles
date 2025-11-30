local harpoon = require 'harpoon'

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

map_normal('<M-h>', function()
  harpoon:list():select(1)
end, '')
map_normal('<M-j>', function()
  harpoon:list():select(2)
end, '')
map_normal('<M-k>', function()
  harpoon:list():select(3)
end, '')
map_normal('<M-l>', function()
  harpoon:list():select(4)
end, '')
