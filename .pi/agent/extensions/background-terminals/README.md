Copied from https://github.com/davis7dotsh/my-pi-setup/tree/main/extensions/background-terminals.

`bg_start` accepts an optional `timeout_seconds` (a positive integer, at most 2147483). For example:

```json
{ "command": "npm run build", "title": "build", "timeout_seconds": 600 }
```

The limit starts when the command launches. At the deadline, the extension stops the process tree with SIGTERM, escalating to SIGKILL if needed. Shutdown can take a few additional seconds. The normal completion notification reports that the command timed out and includes its captured output. Omitting the timeout leaves the runtime unlimited. Exiting, manual termination, and session shutdown cancel the timer.
