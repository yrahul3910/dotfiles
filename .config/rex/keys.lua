-- Conventions:
-- * Actions that modify the state once and are not expected to be used in rapid succession are prefixed by ctrl+a,
--   matching tmux. A tmux running inside Rex gets its prefix from ctrl+a ctrl+a, the same as nested tmux.
-- * Actions that might reasonably be used repeatedly in succession are prefixed by shift+cmd, or live in a mode.
-- * Using the same convention as nvim, j and k are swapped (so j = up, k = down).
-- * Rex matches unshifted keys, so tmux's % " & $ are written shift+5, shift+', shift+7, shift+4 (US layout).

-- ctrl+a starts every sequence below, so readline and nested tmux only see it when it is pressed twice.
rex.bind("ctrl+a>ctrl+a", "pane.send_key", { key = "ctrl+a" })
rex.bind("ctrl+a>r", "client.config.reload")

rex.bind("ctrl+a>l", "pane.split", { direction = "right" })
rex.bind("ctrl+a>k", "pane.split", { direction = "down" })
rex.bind("ctrl+a>shift+5", "pane.split", { direction = "right" })
rex.bind("ctrl+a>shift+'", "pane.split", { direction = "down" })
rex.bind("ctrl+a>=", "pane.balance")
rex.bind("ctrl+a>z", "pane.zoom")
rex.bind("ctrl+a>x", "pane.close")

rex.bind("shift+cmd+l", "pane.resize", { direction = "right", amount = 5 })
rex.bind("shift+cmd+h", "pane.resize", { direction = "left", amount = 5 })
rex.bind("shift+cmd+j", "pane.resize", { direction = "up", amount = 5 })
rex.bind("shift+cmd+k", "pane.resize", { direction = "down", amount = 5 })

-- Rex has no repeat window like tmux's bind -r, so focus moves stay active until Escape or Enter.
rex.mode("focus", { exclusive = true })
rex.bind("ctrl+a>w", "client.mode.enter", { name = "focus" })
rex.bind("focus/h", "pane.focus.left")
rex.bind("focus/j", "pane.focus.up")
rex.bind("focus/k", "pane.focus.down")
rex.bind("focus/l", "pane.focus.right")
rex.bind("focus/enter", "client.mode.exit")

-- Shortcuts for pane switches
rex.bind("alt+l", "pane.focus.right")
rex.bind("alt+h", "pane.focus.left")

-- Rex's New Tab already opens in the focused pane's directory, so tmux's D (neww -c "#{pane_current_path}") is c.
rex.bind("ctrl+a>c", "client.tab.new")
rex.bind("ctrl+a>shift+d", "client.tab.new")
rex.bind("ctrl+a>n", "client.tab.next")
rex.bind("ctrl+a>p", "client.tab.previous")
rex.bind("ctrl+a>,", "client.tab.rename")
rex.bind("ctrl+a>shift+7", "client.tab.close")
rex.bind("ctrl+alt+h", "client.tab.previous")
rex.bind("ctrl+alt+l", "client.tab.next")

for index = 1, 9 do
	rex.bind("ctrl+a>" .. index, "client.tab.goto", { index = index })
end

for index = 1, 6 do
	rex.bind("alt+" .. index, "client.tab.goto", { index = index })
end

-- Rex keeps no session history, so tmux's switch-client -l (ctrl+a L) returns to the session that one of these actions
-- last left: ctrl+a L itself, ctrl+a s / cmd+k, or opt+f. A switch made with the mouse isn't seen; L then falls back to
-- the previous session in list order. The history resets when the config reloads.
local last_session

rex.action({
	name = "change_session",
	title = "Change Session (Remembered)",
	run = function(ctx)
		last_session = ctx.session_id
		rex.client.queue("session.switch")
	end,
})

rex.action({
	name = "last_session",
	title = "Go to Last Session",
	run = function(ctx)
		local target = last_session
		local listing = rex.call("session.list")
		local target_exists = false

		for _, session in ipairs(listing and listing.sessions or {}) do
			if session.session_id == target and target ~= ctx.session_id then
				target_exists = true
			end
		end

		last_session = ctx.session_id

		if not target_exists then
			rex.client.queue("session.previous")
			return
		end

		rex.client.queue("session.select", { session_id = target })
		return { session_id = target }
	end,
})

rex.bind("ctrl+a>s", "change_session")
rex.bind("cmd+k", "change_session")
rex.bind("ctrl+a>shift+l", "last_session")
rex.bind("ctrl+a>shift+4", "session.rename")

-- tmux's M-f: pick a project in a floating terminal, then switch to its session (see ~/.config/rex/sessionizer).
-- Rex (beta 1408) clips a floating layer to its width and height measured from the window's top-left corner, so
-- anything not anchored at 0,0 gets cut off. The layer spans the full width and the script centers fzf with a margin.
rex.action({
	name = "sessionizer",
	title = "Open Project Session",
	run = function(ctx)
		local sessionizer = os.getenv("HOME") .. "/.config/rex/sessionizer"
		last_session = ctx.session_id

		local _, err = rex.session.new_layer({
			focus = true,
			bounds = { 0, 0, 1, 0.6 },
			layout = rex.layout.block({
				flavor = "com.superlogical.terminal.shell",
				options = { command = ctx.client_id and { sessionizer, "-c", ctx.client_id } or { sessionizer } },
			}),
		})

		if err then
			rex.log("error", "sessionizer: " .. err)
		end
	end,
})

rex.bind("alt+f", "sessionizer")
rex.bind("ctrl+a>f", "sessionizer")
