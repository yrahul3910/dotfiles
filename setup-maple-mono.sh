#!/usr/bin/env bash
# Build Maple Mono NF with its character variants frozen in, and install it into ~/Library/Fonts.
# Rex has no setting for OpenType features (Ghostty turns them on with font-feature), so the font has to carry them.
# Maple's build copies each feature's glyph outlines over the defaults and moves contextual rules into calt.
# Re-running does nothing while the installed build matches VERSION and FEATURES.
set -euo pipefail

VERSION=v7.9
FEATURES=cv01,cv02,cv05,cv08,cv65,cv66,cv31,cv34,cv35,cv36,cv37,cv38,cv41

fonts="$HOME/Library/Fonts"
stamp="${XDG_STATE_HOME:-$HOME/.local/state}/maple-mono-nf-build"

[[ "$(cat "$stamp" 2>/dev/null)" == "$VERSION $FEATURES" ]] && exit 0

echo "Building Maple Mono NF $VERSION with $FEATURES..."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -fsSL "https://github.com/subframe7536/maple-font/archive/refs/tags/$VERSION.tar.gz" \
    | tar -xz -C "$work" --strip-components=1

# build.py reads config.json and writes fonts/ relative to the working directory.
(cd "$work" && uv run build.py --nf --feat "$FEATURES" --ttf-only)

mkdir -p "$fonts" "$(dirname "$stamp")"
install -m 644 "$work"/fonts/NF/*.ttf "$fonts"/
echo "$VERSION $FEATURES" >"$stamp"
