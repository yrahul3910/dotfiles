return {
  -- If you came here because some auto-session is broken, they're probably in
  -- ~/.local/share/nvim/sessions/
  'rmagatti/auto-session',
  lazy = false,
  config = function()
    require('auto-session').setup {
      log_level = 'error',
      auto_session_suppress_dirs = { '~/', '~/Projects', '~/Downloads', '/' },
      auto_session_enable_last_session = false,
    }
  end,
}
