local plugins = {
  {
    "yorik1984/newpaper.nvim",
    config = function()
      require("newpaper").setup({
        style = "light"
      })
    end
  },
  {
    "ahmedkhalf/project.nvim",
    lazy = false,
    config = function()
      require("telescope").load_extension("projects")
      require("nvim-tree").setup({
        sync_root_with_cwd = true,
        respect_buf_cwd = true,
        update_focused_file = {
          enable = true,
          update_root = true
        },
      })
      require("project_nvim").setup()
      require("project_nvim.project").init()
    end,
    keys = {
      { "<leader>fp", "<Cmd>Telescope projects<CR>", desc = "Projects" },
    }
  },
  {
      "goolord/alpha-nvim",
      event = "VimEnter",
      config = function ()
        local alpha = require("alpha")
        local dashboard = require("alpha.themes.dashboard")

        dashboard.section.buttons.val = {
          dashboard.button("t", "Show file tree", ":NvimTreeToggle<CR>"),
          dashboard.button("p", " " .. "  Projects", ":Telescope projects <CR>"),
          dashboard.button("SPC j", "󰈚   Restore Session", ":SessionRestore<cr>"),
          dashboard.button("e", "   New file", ":ene <BAR> startinsert <CR>"),
          dashboard.button("f", "   Find file", ":cd $HOME/dotfiles | Telescope find_files<CR>"),
          dashboard.button("g", "󰱼   Find word", ":Telescope live_grep<CR>"),
          dashboard.button("r", "   Recent", ":Telescope oldfiles<CR>"),
          dashboard.button("c", "   Config", ":e $MYVIMRC <CR>"),
          dashboard.button("m", "󱌣   Mason", ":Mason<CR>"),
          dashboard.button("l", "󰒲   Lazy", ":Lazy<CR>"),
          dashboard.button("u", "󰂖   Update plugins", "<cmd>lua require('lazy').sync()<CR>"),
          dashboard.button("q", "   Quit NVIM", ":qa<CR>"),
        }

        dashboard.opts.opts.noautocmd = true

        alpha.setup(dashboard.opts)
        require("alpha").setup(dashboard.opts)
      end,
  };
  {
    "neovim/nvim-lspconfig",
    config = function()
      require "plugins.configs.lspconfig"
      require "custom.configs.lspconfig"
    end
  },
  {
    "kevinhwang91/nvim-ufo",
    dependencies = {
      "kevinhwang91/promise-async"
    }
  },
  {
    "folke/trouble.nvim",
     dependencies = { "nvim-tree/nvim-web-devicons" },
     opts = {
      action_keys = {
        close = "q",
        refresh = "r",
        hover = "K",
        preview = "p",
        open_split = "<c-x>"
      }
    }
  },
  {
    "ThePrimeagen/harpoon",
    branch = "harpoon2",
    lazy = false,
    dependencies = { "nvim-lua/plenary.nvim" },
    config = function(_, opts)
      require("custom.configs.harpoon")
    end,
  },
  {
    "zbirenbaum/copilot.lua",
    cmd = "Copilot",
    build = ":Copilot auth",
    event = "InsertEnter",
    config = function()
      require("copilot").setup({
        panel = {
          enabled = true,
          auto_refresh = true,
        },
        suggestion = {
          enabled = true,
          auto_trigger = true,
          accept = false, -- disable built-in keymapping
        },
      })

      -- hide copilot suggestions when cmp menu is open
      -- to prevent odd behavior/garbled up suggestions
      local cmp_status_ok, cmp = pcall(require, "cmp")
      if cmp_status_ok then
        cmp.event:on("menu_opened", function()
          vim.b.copilot_suggestion_hidden = true
        end)

        cmp.event:on("menu_closed", function()
          vim.b.copilot_suggestion_hidden = false
        end)
      end
    end,
  },
  {
    "hrsh7th/nvim-cmp",
    dependencies = {
      "hrsh7th/cmp-emoji",
      opts = nil,
    },
    ---@param opts cmp.ConfigSchema
    opts = function(_, opts)
      local has_words_before = function()
        unpack = unpack or table.unpack
        local line, col = unpack(vim.api.nvim_win_get_cursor(0))
        return col ~= 0 and vim.api.nvim_buf_get_lines(0, line - 1, line, true)[1]:sub(col, col):match("%s") == nil
      end

      local luasnip = require("luasnip")
      local cmp = require("cmp")

      opts.mapping = vim.tbl_extend("force", opts.mapping, {
        ["<CR>"] = vim.NIL,

        ["<S-Tab>"] = cmp.mapping(function(fallback)
          if cmp.visible() then
            cmp.confirm({ behavior = cmp.ConfirmBehavior.Insert, select = true })
          elseif require("copilot.suggestion").is_visible() then
            require("copilot.suggestion").accept()
          elseif luasnip.expand_or_locally_jumpable() then
            luasnip.expand_or_jump()
          elseif has_words_before() then
            cmp.complete()
          else
            fallback()
          end
        end, { "i", "s" }),
      })
      opts.preselect = cmp.PreselectMode.None
      opts.sources = cmp.config.sources(vim.list_extend(opts.sources, { { name = "emoji" } }))
    end,
  },
  {
    "michaelrommel/nvim-silicon",
    lazy = true,
    cmd = "Silicon",
    init = function()
      local wk = require("which-key")
      wk.register({
        ["<leader>sc"] = { ":Silicon<CR>", "Screenshot Code" }
      }, { mode = "v"})
    end,
    config = function()
      require("silicon").setup({
        font = "FiraCode Nerd Font Mono=16",
        theme = "TwoDark",
        window_title = function()
          return vim.fn.fnamemodify(
            vim.api.nvim_buf_get_name(vim.api.nvim_get_current_buf()), ":t"
          )
        end
      })
    end
  }
}

return plugins
