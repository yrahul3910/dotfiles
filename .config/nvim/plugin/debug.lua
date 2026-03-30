-- From kickstart.nvim
-- debug.lua
--
-- Shows how to use the DAP plugin to debug your code.
--
-- Primarily focused on configuring the debugger for Go, but can
-- be extended to other languages as well. That's why it's called
-- kickstart.nvim and not kitchen-sink.nvim ;)

vim.pack.add({
  -- Creates a beautiful debugger UI
  { src = 'https://github.com/rcarriga/nvim-dap-ui' },

  -- Required dependency for nvim-dap-ui
  { src = 'https://github.com/nvim-neotest/nvim-nio' },

  -- Installs the debug adapters for you
  { src = 'https://github.com/mason-org/mason.nvim' },
  { src = 'https://github.com/jay-babu/mason-nvim-dap.nvim' },

  -- Add your own debuggers here
  { src = 'https://github.com/mfussenegger/nvim-dap-python' },

  -- Main DAP plugin
  { src = 'https://github.com/mfussenegger/nvim-dap' },
})

local dap = require 'dap'
local dapui = require 'dapui'
vim.fn.sign_define('DapBreakpoint', { text = '🔴', texthl = '', linehl = '', numhl = '' })

require('mason-nvim-dap').setup {
  -- Makes a best effort to setup the various debuggers with
  -- reasonable debug configurations
  automatic_installation = true,

  -- You can provide additional configuration to the handlers,
  -- see mason-nvim-dap README for more information
  handlers = {},

  -- You'll need to check that you have the required things installed
  -- online, please don't ask me how to install them :)
  ensure_installed = {
    -- Update this to ensure that you have the debuggers for the langs you want
    -- 'delve',
  },
}

-- For more information, see |:help nvim-dap-ui|
dapui.setup {
  -- Set icons to characters that are more likely to work in every terminal.
  --    Feel free to remove or use ones that you like more! :)
  --    Don't feel like these are good choices.
  icons = { expanded = '▾', collapsed = '▸', current_frame = '*' },
  controls = {
    icons = {
      pause = '⏸',
      play = '▶',
      step_into = '⏎',
      step_over = '⏭',
      step_out = '⏮',
      step_back = 'b',
      run_last = '▶▶',
      terminate = '⏹',
      disconnect = '⏏',
    },
  },
}

dap.listeners.after.event_initialized['dapui_config'] = dapui.open
dap.listeners.before.event_terminated['dapui_config'] = dapui.close
dap.listeners.before.event_exited['dapui_config'] = dapui.close

require('dap-python').setup 'python3'
require('dap-python').test_runner = 'pytest'

local nmap = function(keys, func, desc)
  if desc then
    desc = 'DAP: ' .. desc
  end

  vim.keymap.set('n', keys, func, { desc = desc })
end

nmap('<F5>', dap.continue, 'Debug: Start/Continue' )
nmap('<F1>', dap.step_into,  'Debug: Step Into' )
nmap('<F2>', dap.step_over, 'Debug: Step Over' )
nmap('<F3>', dap.step_out,  'Debug: Step Out' )
nmap('<F7>', dapui.toggle,  'Debug: See last session result.' )
nmap('<leader>Db', dap.toggle_breakpoint,  '[D]ebug: Toggle [B]reakpoint' )
nmap('<leader>Dc', function()
  dap.set_breakpoint(vim.fn.input 'Breakpoint condition: ')
end,  '[D]ebug: Set [C]onditional Breakpoint' )
nmap('<leader>Dt', dapui.toggle,  '[D]ebug: [T]oggle UI' )
