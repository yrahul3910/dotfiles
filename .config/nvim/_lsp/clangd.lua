return {
  cmd = { 'clangd', '--background-index', '--clang-tidy' },
  filetypes = { 'c', 'cpp', 'objc', 'objcpp' },
  root_markers = { '.clangd', '.clang-tidy', 'compile_commands.json', 'compile_flags.txt' },
}
