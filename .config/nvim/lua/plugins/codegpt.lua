return {
  'blob42/codegpt-ng.nvim',
  dependencies = {
    'nvim-lua/plenary.nvim',
    'MunifTanjim/nui.nvim',
  },
  opts = {
    connection = {
      api_provider = 'openai',
      openai_api_key = vim.fn.getenv 'OPENAI_API_KEY',
      chat_completions_url = 'https://api.openai.com/v1/',
    },
    completion = {
      model = 'gpt-5.2',
    },
    ui = {
      stream_output = true,
    },
  },
}
