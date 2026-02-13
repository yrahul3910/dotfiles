return {
  'yrahul3910/codegpt-ng.nvim',
  dependencies = {
    'nvim-lua/plenary.nvim',
    'MunifTanjim/nui.nvim',
  },
  opts = {
    connection = {
      api_provider = 'anthropic',
      openai_api_key = vim.fn.getenv 'ANTHROPIC_API_KEY',
      chat_completions_url = 'https://api.anthropic.com/v1/messages',
    },
    completion = {
      model = 'gpt-5.2',
    },
    ui = {
      stream_output = false,
    },
    models = {
      default = 'claude-sonnet-4-5',
      anthropic = {
        default = 'claude-sonnet-4-5',
        ['claude-sonnet-4-5'] = {},
      },
    },
  },
}
