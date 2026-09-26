export PATH="/usr/local/opt/python/libexec/bin:$PATH"
# Homebrew on Linux, so mise, zoxide, and friends are on PATH in bash too
[[ -x /home/linuxbrew/.linuxbrew/bin/brew ]] && eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
# Toolchains (Node, Rust, Python, uv) from ~/.config/mise/config.toml
command -v mise >/dev/null && eval "$(mise activate bash)"

[[ -f "$HOME/.local/bin/env" ]] && . "$HOME/.local/bin/env"

# Added by LM Studio CLI (lms)
export PATH="$PATH:/Users/ryedida/.lmstudio/bin"
# End of LM Studio CLI section

export PATH=$PATH:$HOME/Downloads/google-cloud-sdk/bin/

command -v zoxide >/dev/null && eval "$(zoxide init bash)"

# uv tools, okf, and no-slop-ts install here (the Antigravity CLI does too)
export PATH="$HOME/.local/bin:$PATH"
