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

export PATH="$HOME/.local/bin:$HOME/.cargo/bin:/opt/homebrew/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

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


# On macOS, Ghostty (installed via the Brewfile) replaces Kitty
install_kitty() {
    [[ "$OS" == "Darwin" ]] && return
    have kitty && return
    [[ -x "$HOME/.local/kitty.app/bin/kitty" ]] && return
    step "Installing Kitty..."
    curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin
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

# Homebrew on Linux needs a compiler and a few base tools from the distro.
install_linux_bootstrap() {
    step "Installing Homebrew prerequisites..."
    case "$DISTRO" in
        redhat) sudo dnf group install -y development-tools
                sudo dnf install -y procps-ng curl file git ;;
        arch)   sudo pacman -S --needed --noconfirm base-devel procps-ng curl file git ;;
        debian) sudo apt-get update
                sudo apt-get install -y build-essential procps curl file git ;;
        *)      echo "Unsupported Linux distribution" >&2; exit 1 ;;
    esac
}

install_homebrew() {
    if ! have brew; then
        step "Installing Homebrew..."
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    eval "$("$(command -v brew || echo /home/linuxbrew/.linuxbrew/bin/brew)" shellenv)"
}

# All packages (brews, casks, Go & Cargo tools) come from the Brewfile; casks and
# macOS-only formulae are guarded with OS.mac? there.
install_packages() {
    [[ "$OS" == "Linux" ]] && install_linux_bootstrap
    install_homebrew
    step "Installing packages from the Brewfile..."
    brew bundle --file="$REPO/Brewfile"
}

setup_dotfiles() {
    step "Setting up dotfiles..."
    backup_if_real "$HOME/.zshrc"
    backup_if_real "$HOME/.config"
    (cd "$REPO" && stow .)
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
    install_kitty
    install_poetry
    install_uv
    install_packages
    setup_dotfiles
    setup_shell
    install_scripts
    setup_desktop
    setup_agent_skills
    setup_stt_server

    printf '\n\n===================\nDone! Please restart your terminal.\n===================\n'
}

main "$@"
