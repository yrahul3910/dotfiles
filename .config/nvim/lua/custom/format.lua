local formatters = {
    ["*.py"] = "ruff check --fix %s",
    ["*.js"] = "eslint --fix %s",
    ["*.html"] = "prettier --write %s",
}

vim.api.nvim_create_augroup("AutoFormat", { clear = true })

for pattern, formatter in pairs(formatters) do
    vim.api.nvim_create_autocmd(
        "BufWritePre",
        {
            pattern = pattern,
            group = "AutoFormat",
            callback = function()
                local bufnr = vim.api.nvim_get_current_buf()
                local filepath = vim.fn.expand("%:p")
                local output = vim.fn.system(string.format(formatter, filepath))
                if vim.v.shell_error == 0 then
                    vim.cmd("silent edit!")
                else
                    vim.api.nvim_err_writeln("Formatter encountered errors:")
                    vim.api.nvim_err_writeln(output)
                    vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, vim.fn.split(output, "\n"))
                end
            end,
        }
    )
end
