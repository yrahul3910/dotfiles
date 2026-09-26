Copied from https://github.com/davis7dotsh/my-pi-setup/tree/main/extensions/background-terminals.

`bg_start` accepts an optional `timeout_seconds` (a positive integer, at most 2147483). For example:

```json
{ "command": "npm run build", "title": "build", "timeout_seconds": 600 }
```

The limit starts when the command launches. At the deadline, the extension stops the process tree with SIGTERM, escalating to SIGKILL if needed. Shutdown can take a few additional seconds. The normal completion notification reports that the command timed out and includes its captured output. Omitting the timeout leaves the runtime unlimited. Exiting, manual termination, and session shutdown cancel the timer.

Use `bg_watch` to schedule progress checks while a command runs:

```json
{ "id": "bt-1", "interval_seconds": 60 }
```

Checks wake the model with elapsed time, time since the last output, and a short output tail, including when the command is quiet. While the model is busy, one check waits per terminal; delivery uses the latest status when the model becomes idle. The next interval starts after delivery, so delayed checks do not arrive in a burst.

Calling `bg_watch` again replaces the interval (whole seconds, up to 2147483). Set `interval_seconds` to `0` to cancel checks while leaving the process running. Exit, kill, timeout, and session shutdown cancel the watch. A watch does not kill a quiet process automatically; the model can investigate and call `bg_kill`, or use `bg_start`'s timeout for a fixed runtime limit.
