local harpoon = require 'harpoon'
local conf = require('telescope.config').values

harpoon:setup {}

local function map_normal(keys, mapping, desc)
  vim.keymap.set('n', keys, mapping, { desc = desc, noremap = true, silent = true })
end

local function toggle_telescope(harpoon_files)
  local file_paths = {}
  for _, item in ipairs(harpoon_files.items) do
    table.insert(file_paths, item.value)
  end

  require('telescope.pickers')
    .new({}, {
      prompt_title = 'Harpoon2',
      finder = require('telescope.finders').new_table {
        results = file_paths,
      },
      previewer = conf.file_previewer {},
      sorter = conf.generic_sorter {},
    })
    :find()
end

map_normal('<leader>pha', function()
  harpoon:list():add()
end, 'Harpoon: add')

map_normal('<leader>pho', function()
  toggle_telescope(harpoon:list())
end, 'Harpoon: open')

map_normal('<S-u>', function()
  harpoon:list():select(1)
end, '')
map_normal('<S-i>', function()
  harpoon:list():select(2)
end, '')
map_normal('<S-o>', function()
  harpoon:list():select(3)
end, '')
map_normal('<S-p>', function()
  harpoon:list():select(4)
end, '')
