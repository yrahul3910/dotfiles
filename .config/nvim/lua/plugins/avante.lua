return {
  'yetone/avante.nvim',
  build = 'make',
  event = 'VeryLazy',
  version = false,

  ---@module 'avante'
  ---@type avante.Config
  opts = {
    instructions_file = 'AGENTS.md',
    provider = 'opencode',
    acp_providers = {
      ['opencode'] = {
        command = 'opencode',
        args = { 'acp' },
      },
    },
    disabled_tools = {
      'rag_search',
      'python',
      'git_diff',
      'git_commit',
      'delete_path',
    },
    behavior = {
      auto_suggestions = false,
    },
    mappings = {
      diff = {
        next = ']h',
        prev = '[h',
      },
      suggestion = {
        accept = '<M-y>',
        dismiss = '<M-n>',
        next = '<M-l>',
        prev = '<M-h>',
      },
      jump = {
        next = ']]',
        prev = '[[',
      },
      submit = {
        normal = '<CR>',
        insert = '<C-s>',
      },
      cancel = {
        normal = { '<C-c>', '<Esc>', 'q' },
        insert = { '<C-c>' },
      },
      sidebar = {
        apply_all = 'A',
        apply_cursor = 'a',
        edit_user_request = 'e',
        remove_file = 'd',
        add_file = '@',
        close = { '<Esc>', 'q' },
      },
    },
  },
  dependencies = {
    'nvim-lua/plenary.nvim',
    'MunifTanjim/nui.nvim',
    'ibhagwan/fzf-lua',
    'nvim-tree/nvim-web-devicons',
    'folke/snacks.nvim',
    'zbirenbaum/copilot.lua',
    {
      -- support for image pasting
      'HakonHarnes/img-clip.nvim',
      event = 'VeryLazy',
      opts = {
        default = {
          embed_image_as_base64 = false,
          prompt_for_file_name = false,
          drag_and_drop = {
            insert_mode = true,
          },
        },
      },
    },
    {
      'MeanderingProgrammer/render-markdown.nvim',
      opts = {
        file_types = { 'markdown', 'Avante' },
      },
      ft = { 'markdown', 'Avante' },
    },
  },
}
