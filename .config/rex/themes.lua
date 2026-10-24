-- Rex stores themes in the app's preferences, not in this config, and has no setting to choose them from Lua. The
-- Ghostty-format theme files in ./themes are the source of truth: on a new machine, run "Import Config Themes" from the
-- command palette once. Rex files each theme under light or dark by its background color and selects it.

local themes_dir = os.getenv("HOME") .. "/.config/rex/themes/"

rex.action{
  name = "import_config_themes",
  title = "Import Config Themes",
  description = "Import the light and dark themes stored in ~/.config/rex/themes.",
  run = function()
    for _, name in ipairs({ "Atom One Light", "GitHub Dark Default" }) do
      rex.client.queue("client.theme.import", { path = themes_dir .. name })
    end
  end,
}
