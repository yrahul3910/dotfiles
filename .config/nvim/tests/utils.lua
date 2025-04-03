local M = {}

function M.wait_for_lsp_ready(server_name, timeout)
  local start = vim.uv.now()
  while (vim.uv.now() - start) / 1e3 < (timeout or 5) do
    local clients = vim.lsp.get_clients()
    for _, client in ipairs(clients) do
      if client.name == server_name and client.initialized then
        return
      end
    end
    vim.wait(50)
  end
  error("LSP server '" .. server_name .. "' did not initialize in time")
end

function M.extract_completion_items(response)
  if not response then
    return {}
  end
  local result = response[1].result
  if not result then
    return {}
  end
  return result.items or result
end

return M
