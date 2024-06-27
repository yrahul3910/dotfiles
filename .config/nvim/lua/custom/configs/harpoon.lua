local harpoon = require('harpoon')
local conf = require('telescope.config').values

harpoon:setup({})

local function toggle_telescope(harpoon_files)
  local file_paths = {}
  for _, item in ipairs(harpoon_files.items) do
    table.insert(file_paths, item.value)
  end

  require("telescope.pickers").new({}, {
    prompt_title = "Harpoon2",
    finder = require("telescope.finders").new_table({
      results = file_paths,
    }),
    previewer = conf.file_previewer({}),
    sorter = conf.generic_sorter({}),
  }):find()
end


vim.keymap.set("n", "<leader>pho", function() toggle_telescope(harpoon:list()) end,
  { desc = "Harpoon2: Open harpoon window" })

-- Basic setup
vim.keymap.set("n", "<leader>pha", function() harpoon:list():add() end,
  { desc = "Harpoon2: Add to list" })
vim.keymap.set("n", "<leader>pht", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end,
  { desc = "Harpoon2: Toggle quick menu" })

vim.keymap.set("n", "<C-1>", function() harpoon:list():select(1) end)
vim.keymap.set("n", "<C-2>", function() harpoon:list():select(2) end)
vim.keymap.set("n", "<C-3>", function() harpoon:list():select(3) end)
vim.keymap.set("n", "<C-4>", function() harpoon:list():select(4) end)

-- Toggle previous & next buffers stored within Harpoon list
vim.keymap.set("n", "<C-S-P>", function() harpoon:list():prev() end)
vim.keymap.set("n", "<C-S-N>", function() harpoon:list():next() end)
