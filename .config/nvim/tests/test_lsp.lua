package.path = package.path .. ';./tests/?.lua'
package.path = package.path .. ';/usr/share/lua/5.4/busted/?.lua'
package.cpath = package.cpath .. ';/usr/share/lua/5.4/busted/?.so'

require 'busted.runner'()
local helpers = require 'utils'

describe('pyright LSP', function()
  it('should provide autocompletions for a struct field', function()
    -- Create a new buffer with Python content
    vim.cmd 'enew'
    vim.bo.filetype = 'python'
    local bufnr = vim.api.nvim_get_current_buf()

    vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, {
      'class Foo:',
      '    bar = 5',
      '',
      'foo = Foo()',
      'print(foo.',
    })

    helpers.wait_for_lsp_ready 'pyright'

    local received_completions = false
    vim.lsp.buf_request(bufnr, 'textDocument/completion', {
      textDocument = { uri = vim.uri_from_bufnr(bufnr) },
      position = { line = 5, character = 10 },
    }, function(err, result)
      assert(not err, 'LSP error: ' .. vim.inspect(err))
      assert(result, 'No completions returned')
      received_completions = true
    end)

    vim.wait(2000, function()
      return received_completions
    end)
    assert(received_completions, 'Completions not received within timeout')
  end)
end)
