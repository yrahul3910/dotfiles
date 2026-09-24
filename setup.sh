#!/usr/bin/env bash
# Machine setup. Safe to re-run: every step checks for its own result first.
# Set DEBUG=1 to trace commands.
set -euo pipefail
[[ "${DEBUG:-}" == "1" ]] && set -x

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"
DISTRO=""
if [[ "$OS" == "Linux" ]]; then
    if [[ -f /etc/redhat-release ]]; then DISTRO=redhat
    elif [[ -f /etc/arch-release ]]; then DISTRO=arch
    elif [[ -f /etc/debian_version ]]; then DISTRO=debian
    fi
fi

export PATH="$HOME/.local/bin:$HOME/.cargo/bin:/opt/homebrew/bin:$PATH"

step() {
    echo ""
    echo ">>> $*"
    echo ""
}

have() {
    command -v "$1" &>/dev/null
}

# Append a line to a file unless it is already present verbatim.
append_line_once() {
    local line="$1" file="$2"
    touch "$file"
    grep -qxF -- "$line" "$file" || echo "$line" >> "$file"
}

# Move a real file or directory out of the way; leave symlinks alone.
backup_if_real() {
    local path="$1"
    if [[ -e "$path" && ! -L "$path" ]]; then
        mv "$path" "$path.bak"
    fi
}

# Copy a file into /usr/local/bin, with sudo when the directory is not writable.
install_bin() {
    local src="$1"
    if [[ -w /usr/local/bin ]]; then
        install -m 755 "$src" /usr/local/bin/
    else
        sudo install -m 755 "$src" /usr/local/bin/
    fi
}

install_rust() {
    have cargo && return
    step "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    . "$HOME/.cargo/env"
}

# On macOS, Node is installed via the Brewfile
install_node() {
    [[ "$OS" == "Darwin" ]] && return
    export NVM_DIR="$HOME/.nvm"
    if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
        step "Installing Node and nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
    fi
    set +u
    . "$NVM_DIR/nvm.sh"
    [[ -s "$NVM_DIR/bash_completion" ]] && . "$NVM_DIR/bash_completion"
    nvm install 26
    set -u
}

# On macOS, Ghostty (installed via the Brewfile) replaces Kitty
install_kitty() {
    [[ "$OS" == "Darwin" ]] && return
    have kitty && return
    [[ -x "$HOME/.local/kitty.app/bin/kitty" ]] && return
    step "Installing Kitty..."
    curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin
}

install_starship() {
    have starship && return
    step "Installing Starship..."
    curl -sS https://starship.rs/install.sh | sh -s -- -y
}

# On macOS, zoxide is installed via the Brewfile
install_zoxide() {
    [[ "$OS" == "Darwin" ]] && return
    have zoxide && return
    step "Installing zoxide..."
    curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
}

install_poetry() {
    have poetry && return
    step "Installing Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
}

install_uv() {
    have uv && return
    step "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
}

install_macos_packages() {
    step "Detected macOS, installing software..."
    if ! have brew; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    # Install all macOS packages (brews, casks, Go & Cargo tools) from the Brewfile
    brew bundle --file="$REPO/Brewfile"
}

install_redhat_packages() {
    step "Detected Red Hat-based system, installing software..."
    sudo dnf install -y zsh vim stow fish python3-neovim cmake ffmpeg fontconfig-devel harfbuzz ripgrep fzf poppler yazi rust-bat git-delta
    sudo dnf install -y gcc gcc-c++ kernel-devel
    if ! have lazygit; then
        sudo dnf copr enable atim/lazygit -y
        sudo dnf install -y lazygit
    fi
}

install_arch_packages() {
    step "Detected Arch-based system, installing software..."
    sudo pacman -Syu --noconfirm
    sudo pacman -S --needed --noconfirm zsh vim stow fish neovim ripgrep fzf poppler zoxide yazi bat git-delta lazygit cmake ffmpeg
}

install_debian_packages() {
    step "Detected Debian-based system, installing software..."
    sudo apt-get update
    sudo apt-get install -y zsh vim build-essential cmake ffmpeg stow poppler rust-bat ripgrep python3-pip git-delta

    have yazi || cargo install --locked yazi-fm yazi-cli

    if ! have lazygit; then
        local version tmp
        version=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
        tmp=$(mktemp -d)
        curl -Lo "$tmp/lazygit.tar.gz" "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${version}_Linux_x86_64.tar.gz"
        tar -C "$tmp" -xf "$tmp/lazygit.tar.gz" lazygit
        sudo install "$tmp/lazygit" /usr/local/bin
        rm -rf "$tmp"
    fi

    if ! have fish; then
        sudo apt-get install -y software-properties-common python3-launchpadlib
        sudo apt-add-repository -y ppa:fish-shell/release-3
        sudo apt-get update
        sudo apt-get install -y fish
    fi
}

install_packages() {
    case "$OS:$DISTRO" in
        Darwin:*)      install_macos_packages ;;
        Linux:redhat)  install_redhat_packages ;;
        Linux:arch)    install_arch_packages ;;
        Linux:debian)  install_debian_packages ;;
        *)             echo "Unsupported system: $OS $DISTRO" >&2; exit 1 ;;
    esac
}

# On macOS, tree-sitter-cli is installed via the Brewfile
install_tree_sitter() {
    [[ "$OS" == "Darwin" ]] && return
    have tree-sitter && return
    cargo install --locked tree-sitter-cli
}

setup_dotfiles() {
    step "Setting up dotfiles..."
    backup_if_real "$HOME/.zshrc"
    backup_if_real "$HOME/.config"
    (cd "$REPO" && stow .)
}

# On Linux, install neovim from the upstream tarball
install_neovim() {
    [[ "$OS" == "Linux" ]] || return 0
    if [[ ! -x /opt/nvim-linux64/bin/nvim ]]; then
        step "Installing neovim..."
        local tmp
        tmp=$(mktemp -d)
        curl -Lo "$tmp/nvim-linux64.tar.gz" https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
        sudo rm -rf /opt/nvim
        sudo tar -C /opt -xzf "$tmp/nvim-linux64.tar.gz"
        rm -rf "$tmp"
    fi
    export PATH="$PATH:/opt/nvim-linux64/bin"
    append_line_once 'export PATH="$PATH:/opt/nvim-linux64/bin"' "$HOME/.zshrc"
    append_line_once 'export PATH="$PATH:/opt/nvim-linux64/bin"' "$HOME/.config/fish/config.fish"
}

setup_desktop() {
    if [[ "$OS" == "Linux" ]] && have gsettings; then
        gsettings set org.gnome.desktop.interface clock-show-weekday true
    fi
    if [[ "$OS" == "Darwin" ]]; then
        # VS Code does not follow XDG conventions on macOS
        mkdir -p "$HOME/Library/Application Support/Code/User"
        cp "$REPO/.config/Code/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
        "$REPO/setup-macos-defaults.sh"
    fi
}

setup_shell() {
    append_line_once 'export PATH="$PATH:~/.local/bin"' "$HOME/.zshrc"
    local zsh
    zsh=$(command -v zsh)
    if [[ "${SHELL:-}" != "$zsh" ]]; then
        chsh -s "$zsh" "$(whoami)"
    fi
}

install_scripts() {
    install_bin "$REPO/tmux-sessionizer"
    install_bin "$REPO/stt-server"
}

# Pi agent skill scripts
setup_agent_skills() {
    step "Setting up agent skills..."
    mkdir -p "$HOME/.local/bin"
    ln -sf "$REPO/.pi/agent/skills/okf/scripts/okf.ts" "$HOME/.local/bin/okf"
    uv tool install -e "$REPO/.agents/skills/no-sloppy"
    bun install --cwd "$REPO/.agents/skills/no-slop-ts" --frozen-lockfile
    ln -sf "$REPO/.agents/skills/no-slop-ts/check.ts" "$HOME/.local/bin/no-slop-ts"
}

# Local speech-to-text server for pi-voice-stt (see .pi/agent/README.md and stt.json).
# Both backends serve /v1/audio/transcriptions on 127.0.0.1:8080; start with `stt-server`.
setup_stt_server() {
    step "Setting up local STT server..."
    mkdir -p "$HOME/projects"
    if [[ "$OS" == "Darwin" ]]; then
        # Swift package; needs Swift 6.2+ (Xcode 26 / matching CLT) on macOS 15+.
        if [[ ! -d "$HOME/projects/macos-speech-server" ]]; then
            git clone https://github.com/dokterbob/macos-speech-server "$HOME/projects/macos-speech-server"
        fi
        (cd "$HOME/projects/macos-speech-server" && swift build -c release)
    else
        # whisper.cpp with CUDA when nvcc is available, otherwise CPU.
        if [[ ! -d "$HOME/projects/whisper.cpp" ]]; then
            git clone https://github.com/ggml-org/whisper.cpp "$HOME/projects/whisper.cpp"
        fi
        (
            cd "$HOME/projects/whisper.cpp"
            if have nvcc; then
                cmake -B build -DGGML_CUDA=1
            else
                cmake -B build
            fi
            cmake --build build -j --config Release
            ./models/download-ggml-model.sh large-v3-turbo
        )
    fi
}

main() {
    install_rust
    install_node
    install_kitty
    install_starship
    install_zoxide
    install_poetry
    install_uv
    install_packages
    install_tree_sitter
    setup_dotfiles
    install_neovim
    setup_shell
    install_scripts
    setup_desktop
    setup_agent_skills
    setup_stt_server

    printf '\n\n===================\nDone! Please restart your terminal.\n===================\n'
}

main "$@"
