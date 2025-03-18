-- Thanks to folke for the config
-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/extras/editor/fzf.lua
return {
  'ibhagwan/fzf-lua',
  cmd = 'FzfLua',
  opts = function(_, opts)
    local config = require 'fzf-lua.config'
    local actions = require 'fzf-lua.actions'

    return {
      'default-title',
      fzf_colors = true,
      fzf_opts = { ['--cycle'] = true },
      defaults = {
        -- formatter = "path.filename_first",
        formatter = 'path.dirname_first',
      },
      ui_select = function(fzf_opts, items)
        return vim.tbl_deep_extend('force', fzf_opts, {
          prompt = ' ',
          winopts = {
            title = ' ' .. vim.trim((fzf_opts.prompt or 'Select'):gsub('%s*:%s*$', '')) .. ' ',
            title_pos = 'center',
            preview = {
              scrollbar = false,
            },
          },
        }, fzf_opts.kind == 'codeaction' and {
          winopts = {
            layout = 'vertical',
            -- height is number of items minus 15 lines for the preview, with a max of 80% screen height
            height = math.floor(math.min(vim.o.lines * 0.8 - 16, #items + 2) + 0.5) + 16,
            width = 0.5,
            preview = not vim.tbl_isempty(LazyVim.lsp.get_clients { bufnr = 0, name = 'vtsls' }) and {
              layout = 'vertical',
              vertical = 'down:15,border-top',
              hidden = 'hidden',
            } or {
              layout = 'vertical',
              vertical = 'down:15,border-top',
            },
          },
        } or {
          winopts = {
            width = 0.5,
            -- height is number of items, with a max of 80% screen height
            height = math.floor(math.min(vim.o.lines * 0.8, #items + 2) + 0.5),
          },
        })
      end,
      previewers = {
        builtin = {
          -- treesitter can cause large files to render slowly, hanging fzf-lua
          syntax_limit_b = 1024 * 100, -- 100 KB
        },
      },
      winopts = {
        width = 0.8,
        height = 0.8,
        row = 0.5,
        col = 0.5,
        preview = {
          scrollchars = { '┃', '' },
        },
      },
      files = {
        cwd_prompt = false,
        actions = {
          ['alt-i'] = { actions.toggle_ignore },
          ['alt-h'] = { actions.toggle_hidden },
        },
      },
      grep = {
        actions = {
          ['alt-i'] = { actions.toggle_ignore },
          ['alt-h'] = { actions.toggle_hidden },
        },
      },

      config = function(_, opts)
        if opts[1] == 'default-title' then
          -- use the same prompt for all pickers for profile `default-title` and
          -- profiles that use `default-title` as base profile
          local function fix(t)
            t.prompt = t.prompt ~= nil and ' ' or nil
            for _, v in pairs(t) do
              if type(v) == 'table' then
                fix(v)
              end
            end
            return t
          end
          opts = vim.tbl_deep_extend('force', fix(require 'fzf-lua.profiles.default-title'), opts)
          opts[1] = nil
        end
        require('fzf-lua').setup(opts)
      end,
      init = function()
        vim.ui.select = function(...)
          require('lazy').load { plugins = { 'fzf-lua' } }
          return vim.ui.select(...)
        end
      end,
    }
  end,
}
