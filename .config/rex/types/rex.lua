---@meta rex

-- LuaLS definitions for the `rex` global, which the Rex server injects into its Lua 5.1 runtime. Rex ships no
-- definitions of its own, so these follow https://www.superlogical.com/rex/docs/reference/lua by hand; when the two
-- disagree, `rex api describe` and the running server win.

---@alias rex.LogLevel "debug"|"info"|"warn"|"error"

---@alias rex.ArgType
---| "string" | "number" | "integer" | "boolean" | "object" | "array" | "any"
---| "string?" | "number?" | "integer?" | "boolean?" | "object?" | "array?" | "any?"

---Who an action, key function, or event handler is running for. A field Rex doesn't know is absent.
---@class rex.Context
---@field session_id? string
---@field block_id? string
---@field client_id? string
---@field origin? string
---@field server? string

---@class rex.KeyEvent
---@field keybinding string The key that was pressed.
---@field prefix? string[] For a key sequence, the keys pressed before `keybinding`.

---@alias rex.KeyFunction fun(ctx: rex.Context, ev: rex.KeyEvent): boolean?

---@class rex.Binding
---@field key string The key or sequence, without its mode.
---@field mode? string
---@field action? string The action name, or `nil` for a function binding.
---@field fn? rex.KeyFunction The function, or `nil` for an action binding.
---@field args? table
---@field source string Where it was bound, such as `keys.lua:3`.

---@class rex.BindingFilter
---@field key? string
---@field mode? string
---@field action? string

---@class rex.ModeOptions
---@field exclusive? boolean Defaults to `false`.

---@class rex.Mode
---@field name string
---@field exclusive boolean
---@field source string

---@class rex.ActionSpec
---@field name string Lowercase letters, digits, and underscores.
---@field title string Shown in the command palette.
---@field run fun(ctx: rex.Context, args: table): any Its return value is the action's result.
---@field description? string
---@field category? string The palette group. Defaults to `Actions`.
---@field keywords? string Extra words for palette search.
---@field args? table<string, rex.ArgType>|table Argument types by name, or a JSON Schema.
---@field repeats? boolean Run again while the key is held.

---@class rex.HostSpec
---@field label string
---@field endpoints? string[] Addresses tried in order. Required unless `endpoint` is set.
---@field endpoint? string A single address, in place of `endpoints`.
---@field id? string A stable ID, so the host keeps its identity when renamed.
---@field icon? string

---A layout table built by `rex.layout`, taken by `new_window`, `new_split`, and `new_layer`.
---@class rex.Layout

---@class rex.TerminalOptions
---@field command? string[] The program and its arguments. Without it, an interactive shell starts.
---@field shell? string The shell to use. `"none"` starts `command` directly.
---@field cwd? string
---@field initial_input? string Text typed into the terminal once it starts.
---@field exit? { on_completion: boolean } `{ on_completion = false }` keeps the terminal open after its program exits.

---@class rex.BlockSpec
---@field flavor string What to create, such as `com.superlogical.terminal.shell`.
---@field options? rex.TerminalOptions|table

---Returns a result table, or `nil` and an error message. It never raises.
---@alias rex.SessionMethod fun(args?: table): table?, string?

---Session methods. `session_id` is filled in when left out; other IDs such as `block_id` are not. Run
---`rex api describe session.<method>` for a method's arguments and result.
---@class rex.Session
---@field view rex.SessionMethod Return the session's windows, layouts, and blocks.
---@field list_blocks rex.SessionMethod List every block and whether it is placed or detached.
---@field list_clients rex.SessionMethod List the clients attached to the session.
---@field describe_block rex.SessionMethod Return a block's placement and the methods it offers.
---@field new_window rex.SessionMethod Create a window from a layout.
---@field new_split rex.SessionMethod Create a split beside an existing block.
---@field new_block rex.SessionMethod Create a block without placing it in a layout.
---@field new_layer rex.SessionMethod Create a floating layer in a window.
---@field close_window rex.SessionMethod Close a window and every block in it.
---@field close_layer rex.SessionMethod Close a floating layer and every block in it.
---@field move_block rex.SessionMethod Move a block into a new split beside another.
---@field swap_blocks rex.SessionMethod Exchange the positions of two blocks.
---@field detach_block rex.SessionMethod Remove a block from its layout without closing it.
---@field float_block rex.SessionMethod Move a tiled block into a new floating layer.
---@field zoom_block rex.SessionMethod Toggle or set whether a block fills its window.
---@field resize_pane rex.SessionMethod Move the border between two blocks.
---@field resize_layer rex.SessionMethod Set a floating layer's position and size.
---@field raise_layer rex.SessionMethod Move a floating layer up the stacking order.
---@field lower_layer rex.SessionMethod Move a floating layer down the stacking order.
---@field move_window rex.SessionMethod Move a window in the tab order.
---@field focus_block rex.SessionMethod
---@field focus_window rex.SessionMethod
---@field focus_direction rex.SessionMethod Focus the nearest block in a direction.
---@field focus_next_pane rex.SessionMethod
---@field focus_previous_pane rex.SessionMethod
---@field focus_next_window rex.SessionMethod
---@field focus_previous_window rex.SessionMethod
---@field set_label rex.SessionMethod Set the session's label.
---@field set_window_label rex.SessionMethod
---@field set_block_label rex.SessionMethod
---@field attach rex.SessionMethod Change which session a script hears events from.
---@field detach rex.SessionMethod Change which session a script hears events from.
---@field help rex.SessionMethod Describe the methods available through the session.
---@field [string] rex.SessionMethod
local session = {}

---@class rex.BlockApi
local block = {}

---Calls a method on a block, such as the terminal's `format`, `process`, `pwd`, `title`, `size`, `write`, `reset`,
---`resize`, `set_theme`, `program_status`, or `list_dir`. `block_id` is filled in from the current block when left out.
---
---```lua
---local title = rex.block.call("com.superlogical.terminal", "title", {}).title
---```
---@param creator string The full name of the kind of block, such as `com.superlogical.terminal`.
---@param method string
---@param args? table
---@return table? result
---@return string? err
function block.call(creator, method, args) end

---What `rex.server(label)` returns. Calls through it don't fill in `session_id` or `block_id`.
---@class rex.Server
---@field session rex.Session
---@field block rex.BlockApi
---@field call fun(method: string, args?: table): table?, string?

---The API the Rex server adds to Lua. Each function notes where it works: in the configuration file at load,
---in the configuration file later (inside an action, key function, or event handler), or in `rex do` scripts.
---@class rex
rex = {}

rex.session = session
rex.block = block

---Builders for the `layout` table. They only build tables and call nothing.
rex.layout = {}

rex.client = {}

---The script's arguments. Scripts only; `nil` in the configuration file.
---@type table
rex.args = {}

---The session the script runs against. Scripts only; `nil` in the configuration file.
---@type string
rex.session_id = ""

---The block the script runs against, or `nil`. Scripts only.
---@type string?
rex.block_id = nil

---Binds a key to an action by name. `key` is a single key, a sequence written with `>`, or either one prefixed with
---a mode and a slash, such as `"resize/h"`.
---
---With a function, it is called as `fn(ctx, ev)`; return `true` to mark the key as handled. Function bindings are not
---allowed in a mode.
---
---Config at load. Later, only function bindings work.
---
---```lua
---rex.bind("cmd+d", "pane.split", { direction = "right" })
---rex.bind("ctrl+b>c", "window.new")
---```
---@param key string
---@param action string
---@param args? table Arguments passed to the action.
---@overload fun(key: string, fn: rex.KeyFunction)
function rex.bind(key, action, args) end

---Removes the bindings of a key in this file and in the client's defaults, and returns how many of this file's
---bindings it removed. `target` limits the removal to bindings with that action or function.
---`rex.unbind("mode/key")` also blocks the key in that mode.
---
---Pass `{ mode = name }` to remove a whole mode, or a table from `rex.bindings()` to remove that one binding.
---@param key string
---@param target? string|rex.KeyFunction
---@return integer removed
---@overload fun(spec: { mode: string })
---@overload fun(binding: rex.Binding): integer
function rex.unbind(key, target) end

---Declares a mode and sets its options. Config at load only.
---@param name string
---@param options? rex.ModeOptions
function rex.mode(name, options) end

---Returns, in order, the bindings this file and the files it requires have made so far. Config at load only.
---@param filter? rex.BindingFilter
---@return rex.Binding[]
function rex.bindings(filter) end

---Returns the modes declared or bound so far. Config at load only.
---@return rex.Mode[]
function rex.modes() end

---Defines an action that can be bound to a key, run from the command palette, or invoked. Config at load, or in a
---script.
---
---```lua
---rex.action{
---  name = "scratch",
---  title = "Open Scratch Window",
---  run = function(ctx, args)
---    rex.session.new_window{ layout = rex.layout.block{ flavor = "com.superlogical.terminal.shell" } }
---  end,
---}
---```
---@param spec rex.ActionSpec
function rex.action(spec) end

---Runs an action and returns its result, or `nil` and an error message. In the configuration file only that file's
---own actions can be invoked; a script can also invoke the configuration file's actions. Calls nest up to 16 deep.
---@param name string
---@param args? table
---@return any result
---@return string? err
function rex.invoke(name, args) end

---Asks the client to perform one of its own actions, such as `pane.zoom`. In an action, queued actions run in order
---after `run` returns and are discarded if it fails; in a script each runs immediately. Raises an error when there is
---no client to ask.
---@param name string
---@param args? table
function rex.client.queue(name, args) end

---Calls any server method by its full name, including ones `rex.session` doesn't cover. Returns a result table, or
---`nil` and an error message; it never raises. `rex api list` prints every method. Fails at config load.
---
---```lua
---local result, err = rex.call("session.list")
---```
---@param method string
---@param args? table
---@return table? result
---@return string? err
function rex.call(method, args) end

---One block.
---@param spec rex.BlockSpec
---@return rex.Layout
function rex.layout.block(spec) end

---Two layouts split horizontally.
---@param ratio number The share given to `a`, from 0 to 1.
---@param a rex.Layout
---@param b rex.Layout
---@return rex.Layout
function rex.layout.horizontal(ratio, a, b) end

---Two layouts split vertically.
---@param ratio number The share given to `a`, from 0 to 1.
---@param a rex.Layout
---@param b rex.Layout
---@return rex.Layout
function rex.layout.vertical(ratio, a, b) end

---Calls `fn(ctx, ev)` each time `event` happens. Scripts only; a warning at config load. See
---https://www.superlogical.com/rex/docs/reference/events for event names.
---@param event string
---@param fn fun(ctx: rex.Context, ev: table)
function rex.on(event, fn) end

---Blocks until `event` happens and returns `ev` and `ctx`, or `nil` and `"timeout"` after `timeout` seconds. `filter`
---is a table of fields the event must match, or a function called as `filter(ev, ctx)`. Scripts only.
---@param event string
---@param filter? table|fun(ev: table, ctx: rex.Context): boolean
---@param timeout? number
---@return table? ev
---@return rex.Context|"timeout" ctx
function rex.wait(event, filter, timeout) end

---Blocks for a number of seconds, which may be fractional. Scripts only.
---@param seconds number
function rex.sleep(seconds) end

---Ends the script immediately; `rex do` exits with `code`, or 0. Scripts only.
---@param code? integer
function rex.stop(code) end

---Declares another Rex server you connect to. Config at load only.
---@param spec rex.HostSpec
function rex.host(spec) end

---Returns the labels of the other servers available to the running action or script.
---@return string[]
function rex.servers() end

---Returns an API whose calls go to the server named `label`. Raises an error for an unknown label.
---@param label string
---@return rex.Server
function rex.server(label) end

---Writes a log message. In a script the message is printed to the terminal.
---@param level rex.LogLevel
---@param message string
---@overload fun(message: string)
function rex.log(level, message) end
