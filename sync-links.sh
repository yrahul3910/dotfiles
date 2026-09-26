#!/usr/bin/env bash
# Keep the links in ~ in step with this repo. Safe to run any time; the git hooks
# in .githooks run it after commits, pulls, checkouts, and rebases.
#
#   1. Remove links in ~ that point into this repo at files that no longer exist.
#      stow cleans these up itself, except after a whole directory is deleted from
#      the repo: it never looks inside the matching directory in ~.
#   2. Restow, which links new files and unlinks renamed or deleted ones.
#
# Usage: sync-links.sh [--dry-run]
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# Git apps often run hooks with a minimal PATH, so make sure stow is found.
export PATH="$PATH:/opt/homebrew/bin:/home/linuxbrew/.linuxbrew/bin:/usr/local/bin"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

# Resolve . and .. in a path by text alone, since a dangling link's target
# directory may no longer exist.
normalize() {
    local part out=() IFS=/
    set -f
    for part in $1; do
        case "$part" in
            "" | .) ;;
            ..) ((${#out[@]})) && unset 'out[${#out[@]}-1]' ;;
            *) out+=("$part") ;;
        esac
    done
    set +f
    printf '/%s' "${out[@]}"
}

# Every directory the repo has tracked on any branch, including recently deleted
# branches through the reflog. stow only puts links in the matching directories
# under ~, so this covers folders deleted from the repo or left on another branch.
tracked_dirs() {
    echo .
    git -C "$REPO" log --all --reflog --name-only --pretty=format: -- . \
        | awk -F/ 'NF > 1 { NF--; print }' OFS=/ | sort -u
}

search=()
while IFS= read -r dir; do
    [[ -d "$HOME/$dir" && ! -L "$HOME/$dir" ]] && search+=("$HOME/$dir")
done < <(tracked_dirs)

pruned=0
while IFS= read -r -d '' link; do
    [[ -e "$link" ]] && continue                     # target still exists
    target=$(readlink "$link")
    [[ "$target" == /* ]] && continue                # stow's links are always relative
    rel=${link#"$HOME"/}
    # Only a link stow made: it points at the same path inside the repo.
    [[ "$(normalize "$(dirname "$link")/$target")" == "$REPO/$rel" ]] || continue
    pruned=$((pruned + 1))
    if ((DRY_RUN)); then
        echo "would remove dangling link $rel"
        continue
    fi
    rm "$link"
    # Remove directories this leaves empty. rmdir refuses non-empty ones, so app
    # files living beside the link are kept.
    dir=$(dirname "$link")
    while [[ "$dir" != "$HOME" ]] && rmdir "$dir" 2>/dev/null; do
        dir=$(dirname "$dir")
    done
done < <(find "${search[@]}" -maxdepth 1 -type l -print0 2>/dev/null)

if ((DRY_RUN)); then
    echo "dangling links found: $pruned"
    (cd "$REPO" && stow -n -v --no-folding --restow . 2>&1 | grep -vE 'reverts previous action|^UNLINK|simulation mode' || true)
else
    ((pruned)) && echo "sync-links: removed $pruned dangling link(s)"
    (cd "$REPO" && stow --no-folding --restow .)
fi
