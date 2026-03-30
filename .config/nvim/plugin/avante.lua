vim.pack.add {
  {
    src = 'https://github.com/nvim-lua/plenary.nvim',
  },
  {
    src = 'https://github.com/MunifTanjim/nui.nvim',
  },
  {
    src = 'https://github.com/ibhagwan/fzf-lua',
  },
  {
    src = 'https://github.com/nvim-tree/nvim-web-devicons',
  },
  {
    src = 'https://github.com/folke/snacks.nvim',
  },
  {
    src = 'https://github.com/zbirenbaum/copilot.lua',
  },
  {
    src = 'https://github.com/MeanderingProgrammer/render-markdown.nvim',
  },
  {
    src = 'https://github.com/yetone/avante.nvim',
  },
}

require('render-markdown.nvim').setup {}

require('avante.nvim').setup {
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
  behaviour = {
    auto_suggestions = false,
    auto_approve_tool_permissions = false,
    auto_apply_diff_after_generation = false,
    confirmation_ui_style = 'popup',
  },
  mappings = {
    diff = {
      next = ']h',
      prev = '[h',
    },
    suggestion = {
      accept = '<M-y>',
      dismiss = '<M-n>',
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
}
