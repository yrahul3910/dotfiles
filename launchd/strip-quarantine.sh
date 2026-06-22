#!/bin/bash

LOG=/tmp/stripquarantine.log
WATCHED=("$HOME/Downloads" "$HOME/Desktop" "/Applications")

echo "[fired $(date)]" >> "$LOG"
echo "HOME=[$HOME] USER=[$USER]" >> "$LOG"

for dir in "${WATCHED[@]}"; do
    echo "scanning: [$dir]" >> "$LOG"
    /usr/bin/find "$dir" -maxdepth 1 -xattrname com.apple.quarantine -print0 2>>"$LOG" \
        | /usr/bin/xargs -0 /usr/bin/xattr -d com.apple.quarantine 2>>"$LOG"
    echo "find exit: ${PIPESTATUS[0]}  xargs exit: ${PIPESTATUS[1]}" >> "$LOG"
done
