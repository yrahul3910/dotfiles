return {
  'saghen/blink.cmp',
  lazy = true,
  event = { 'InsertEnter', 'BufWinEnter' },
  dependencies = { 'L3MON4D3/LuaSnip', version = 'v2.*' },
  version = 'v1.3.1',

  ---@module 'blink.cmp'
  ---@type blink.cmp.Config
  opts = {
    -- 'default' for mappings similar to built-in completion
    -- 'super-tab' for mappings similar to vscode (tab to accept, arrow keys to navigate)
    -- 'enter' for mappings similar to 'super-tab' but with 'enter' to accept
    -- see the "default configuration" section below for full documentation on how to define
    -- your own keymap.
    --
    -- All presets have the following mappings:
    -- <tab>/<s-tab>: move to right/left of your snippet expansion
    -- <c-space>: Open menu or open docs if already open
    -- <c-n>/<c-p> or <up>/<down>: Select next/previous item
    -- <c-e>: Hide menu
    -- <c-k>: Toggle signature help
    keymap = {
      preset = 'default',
      ['<Tab>'] = {}, -- Disable Tab for snippet navigation
      ['<S-Tab>'] = {
        function(_)
          if _G.myconfig.copilot_enabled and require('copilot.suggestion').is_visible() then
            require('copilot.suggestion').accept()
          end
        end,
      },
    },

    appearance = {
      -- Sets the fallback highlight groups to nvim-cmp's highlight groups
      -- Useful for when your theme doesn't support blink.cmp
      -- will be removed in a future release
      use_nvim_cmp_as_default = true,
      -- Set to 'mono' for 'Nerd Font Mono' or 'normal' for 'Nerd Font'
      -- Adjusts spacing to ensure icons are aligned
      nerd_font_variant = 'mono',
    },

    snippets = { preset = 'luasnip' },

    -- default list of enabled providers defined so that you can extend it
    -- elsewhere in your config, without redefining it, via `opts_extend`
    sources = {
      default = { 'lsp', 'path', 'snippets', 'buffer', 'lazydev' },
      -- optionally disable cmdline completions
      -- cmdline = {},
      providers = {
        snippets = {
          score_offset = 100,
        },
        lazydev = {
          name = 'LazyDev',
          module = 'lazydev.integrations.blink',
          -- make lazydev completions top priority (see `:h blink.cmp`)
          score_offset = 100,
        },
      },
    },

    -- Blink.cmp includes an optional, recommended rust fuzzy matcher,
    -- which automatically downloads a prebuilt binary when enabled.
    --
    -- See :h blink-cmp-config-fuzzy for more information
    fuzzy = { implementation = 'prefer_rust_with_warning' },

    -- experimental signature help support
    signature = { enabled = true },

    completion = {
      documentation = {
        auto_show = true,
        auto_show_delay_ms = 100,
      },
    },
  },
  -- allows extending the providers array elsewhere in your config
  -- without having to redefine it
  opts_extend = { 'sources.default' },
}
