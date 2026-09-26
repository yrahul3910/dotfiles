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

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

step() {
    echo ""
    echo ">>> $*"
    echo ""
}

have() {
    command -v "$1" &>/dev/null
}

# Move a real file or directory out of the way; leave symlinks alone.
backup_if_real() {
    local path="$1"
    if [[ -e "$path" && ! -L "$path" ]]; then
        mv "$path" "$path.bak"
    fi
}

# Copy a file into /usr/local/bin, with sudo when the directory is not writable.
# .tmux.conf calls tmux-sessionizer by this path. A fresh Apple Silicon Mac has no
# /usr/local/bin at all, so create it first.
install_bin() {
    local src="$1"
    [[ -d /usr/local/bin ]] || sudo mkdir -p /usr/local/bin
    if [[ -w /usr/local/bin ]]; then
        install -m 755 "$src" /usr/local/bin/
    else
        sudo install -m 755 "$src" /usr/local/bin/
    fi
}

# On macOS, Ghostty (installed via the Brewfile) replaces Kitty
install_kitty() {
    [[ "$OS" == "Darwin" ]] && return
    have kitty && return
    [[ -x "$HOME/.local/kitty.app/bin/kitty" ]] && return
    step "Installing Kitty..."
    curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin
}

# Homebrew on Linux needs a compiler and a few base tools from the distro. The
# Brewfile's cargo entries also need pkg-config, OpenSSL headers, and protoc from
# system paths: brew bundle narrows PATH, so Homebrew's own copies are not visible.
install_linux_bootstrap() {
    step "Installing Homebrew prerequisites..."
    case "$DISTRO" in
        redhat) sudo dnf group install -y development-tools c-development
                sudo dnf install -y procps-ng curl file git pkgconf-pkg-config openssl-devel protobuf-compiler protobuf-devel ;;
        arch)   sudo pacman -Syu --needed --noconfirm base-devel procps-ng curl file git openssl protobuf ;;
        debian) sudo apt-get update
                sudo apt-get install -y build-essential procps curl file git pkg-config libssl-dev protobuf-compiler libprotobuf-dev ;;
        *)      echo "Unsupported Linux distribution" >&2; exit 1 ;;
    esac
}

install_homebrew() {
    if ! have brew; then
        step "Installing Homebrew..."
        # The installer only asks for your sudo password when stdin is a terminal,
        # which it is not under bootstrap's `curl | bash`. Hand it the terminal when
        # there is one; without one it runs unattended and needs passwordless sudo.
        local installer
        installer="$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if { : </dev/tty; } 2>/dev/null; then
            /bin/bash -c "$installer" </dev/tty
        else
            NONINTERACTIVE=1 /bin/bash -c "$installer"
        fi
    fi
    eval "$("$(command -v brew || echo /home/linuxbrew/.linuxbrew/bin/brew)" shellenv)"
}

# Homebrew plus stow, so dotfiles can be linked before anything else runs.
install_base() {
    [[ "$OS" == "Linux" ]] && install_linux_bootstrap
    install_homebrew
    have stow || brew install stow
}

# Node, Rust, Python, and uv come from .config/mise/config.toml, which stow has
# linked into ~/.config by now. It must be the global config: brew bundle scrubs
# the environment before running the Brewfile's cargo and uv entries, so their
# shims only find toolchains through the normal ~/.config location.
install_toolchains() {
    have mise || brew install mise
    step "Installing toolchains with mise..."
    # brew bundle runs from inside the repo, where mise also sees this file as a
    # project config; trust it so shims launched from there do not refuse to run.
    mise trust --quiet "$REPO"
    mise install --yes
    eval "$(mise activate bash --shims)"
}

# All packages (brews, casks, Go & Cargo tools) come from the Brewfile; casks and
# macOS-only formulae are guarded with OS.mac? there. A failed entry, usually a
# cargo crate that does not build, should not stop the rest of setup, so it is
# recorded here and reported when main finishes.
BUNDLE_FAILED=0
install_packages() {
    step "Installing packages from the Brewfile..."
    brew bundle --file="$REPO/Brewfile" || BUNDLE_FAILED=1
}

# --no-folding links individual files and leaves every directory real, so app
# state written next to tracked config stays in ~ instead of landing in the repo.
# --restow makes re-runs pick up files added to the repo since the last run.
setup_dotfiles() {
    step "Setting up dotfiles..."
    # Fresh images ship real files stow would refuse to replace, such as ~/.bashrc.
    local target
    for target in $(cd "$REPO" && stow -n --no-folding --restow . 2>&1 \
            | grep -oE 'over existing target [^ ]+' | awk '{print $4}'); do
        backup_if_real "$HOME/$target"
    done
    (cd "$REPO" && stow --no-folding --restow .)
    # Pi extensions are code with their own node_modules, and Pi resolves imports
    # from the link path, so this directory is one link (excluded in .stow-local-ignore).
    local ext="$HOME/.pi/agent/extensions"
    if [[ -L "$ext" || ! -e "$ext" ]]; then
        mkdir -p "$HOME/.pi/agent"
        ln -sfn "$REPO/.pi/agent/extensions" "$ext"
    else
        echo "$ext is a real directory; move it aside so it can be linked" >&2
        exit 1
    fi
}

setup_desktop() {
    # Servers can have gsettings without the GNOME schemas, so check for the schema.
    if [[ "$OS" == "Linux" ]] && have gsettings \
            && gsettings list-schemas | grep -qx org.gnome.desktop.interface; then
        gsettings set org.gnome.desktop.interface clock-show-weekday true
    fi
    if [[ "$OS" == "Darwin" ]]; then
        # VS Code does not follow XDG conventions on macOS
        mkdir -p "$HOME/Library/Application Support/Code/User"
        cp "$REPO/.config/Code/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
        "$REPO/setup-macos-defaults.sh"
    fi
}

# fish is the login shell. .zshrc and .bashrc stay in the repo for the occasional
# zsh or bash session, but setup never switches to them.
setup_shell() {
    local fish current
    fish=$(command -v fish)

    # Homebrew's fish is not in /etc/shells, and chsh refuses unlisted shells.
    grep -qxF "$fish" /etc/shells || echo "$fish" | sudo tee -a /etc/shells >/dev/null

    if [[ "$OS" == "Darwin" ]]; then
        current=$(dscl . -read "/Users/$(whoami)" UserShell | awk '{print $2}')
    else
        current=$(getent passwd "$(whoami)" | cut -d: -f7)
    fi
    # Already fish, possibly through another path to the same binary
    # (for example /usr/local/bin/fish linking to Homebrew's).
    [[ "$(realpath "$current" 2>/dev/null)" == "$(realpath "$fish")" ]] && return 0

    if [[ "$OS" == "Darwin" ]]; then
        # sudo reuses the credentials cached for Homebrew; plain chsh would ask again.
        sudo chsh -s "$fish" "$(whoami)"
    else
        # chsh prompts for a password or is missing on some images; usermod is not.
        sudo usermod -s "$fish" "$(whoami)"
    fi
}

# kanata reads real keyboards and writes to a virtual one through uinput. On Linux
# that needs the uinput module, a udev rule opening /dev/uinput to the uinput
# group, and membership in the input and uinput groups. Group changes apply from
# the next login. Start it with `systemctl --user enable --now kanata`.
setup_kanata() {
    [[ "$OS" == "Linux" ]] || return 0
    have kanata || return 0
    step "Granting kanata access to input devices..."
    getent group uinput >/dev/null || sudo groupadd --system uinput
    sudo usermod -aG input,uinput "$(whoami)"
    local rule='KERNEL=="uinput", MODE="0660", GROUP="uinput", OPTIONS+="static_node=uinput"'
    local rule_file=/etc/udev/rules.d/99-kanata-uinput.rules
    if [[ "$(cat "$rule_file" 2>/dev/null)" != "$rule" ]]; then
        echo "$rule" | sudo tee "$rule_file" >/dev/null
        sudo udevadm control --reload-rules
    fi
    echo uinput | sudo tee /etc/modules-load.d/uinput.conf >/dev/null
    if sudo modprobe uinput; then
        sudo udevadm trigger --sysname-match=uinput
    else
        echo "Could not load the uinput module; kanata will not work on this kernel." >&2
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
        # Built once; delete .build to force a rebuild after pulling updates.
        local dir="$HOME/projects/macos-speech-server"
        [[ -x "$dir/.build/release/speech-server" ]] && return 0
        [[ -d "$dir" ]] || git clone https://github.com/dokterbob/macos-speech-server "$dir"
        (cd "$dir" && swift build -c release)
    else
        # whisper.cpp with CUDA when nvcc is available, otherwise CPU. Built once;
        # delete build/ to force a rebuild after pulling updates.
        local dir="$HOME/projects/whisper.cpp"
        [[ -d "$dir" ]] || git clone https://github.com/ggml-org/whisper.cpp "$dir"
        (
            cd "$dir"
            if [[ ! -x build/bin/whisper-server ]]; then
                if have nvcc; then
                    cmake -B build -DGGML_CUDA=1
                else
                    cmake -B build
                fi
                cmake --build build -j --config Release
            fi
            # The download script skips a model that is already present.
            ./models/download-ggml-model.sh large-v3-turbo
        )
    fi
}

main() {
    install_kitty
    install_base
    setup_dotfiles
    install_toolchains
    install_packages
    setup_shell
    setup_kanata
    install_scripts
    setup_desktop
    setup_agent_skills
    setup_stt_server

    if [[ "$BUNDLE_FAILED" == 1 ]]; then
        printf '\n\nSetup finished, but some Brewfile entries failed to install.\n'
        printf 'Scroll up to the brew bundle output, or run: brew bundle check --verbose --file=%s\n' "$REPO/Brewfile"
        exit 1
    fi
    printf '\n\n===================\nDone! Please restart your terminal.\n===================\n'
}

main "$@"
