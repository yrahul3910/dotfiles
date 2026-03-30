-- If you came here because some auto-session is broken, they're probably in
-- ~/.local/share/nvim/sessions/
vim.pack.add {
  src = 'https://github.com/rmagatti/auto-session',
}

require('auto-session').setup {
  log_level = 'error',
  purge_after_minutes = 43200, -- 30 days
  auto_session_suppress_dirs = { '~/', '~/Projects', '~/Downloads', '/' },
  auto_session_enable_last_session = false,
}
