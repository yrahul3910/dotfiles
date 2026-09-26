#!/bin/bash
# Fresh-machine installer: installs git, clones this repo to ~/configs, and runs
# setup.sh. Usage (see README):
#   curl -sSL https://raw.githubusercontent.com/yrahul3910/dotfiles/master/bootstrap.sh | bash
set -ex

REPO_URL="https://github.com/yrahul3910/dotfiles/"
CLONE_DIR="$HOME/configs"

# Homebrew's installer only asks for your password when stdin is a terminal. Under
# `curl | bash` stdin is this script, so hand it the terminal when there is one;
# without one (CI, a headless VM) it runs unattended and needs passwordless sudo.
run_homebrew_installer() {
    local installer
    installer="$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if { : </dev/tty; } 2>/dev/null; then
        /bin/bash -c "$installer" </dev/tty
    else
        NONINTERACTIVE=1 /bin/bash -c "$installer"
    fi
}

install_git() {
    case "$(uname -s)" in
        Linux)
            # Under `curl | bash`, stdin is the script itself, so every package
            # command must run without asking for confirmation.
            if command -v apt-get >/dev/null; then
                sudo apt-get update
                sudo apt-get install -y git
            elif command -v dnf >/dev/null; then
                sudo dnf install -y git
            elif command -v yum >/dev/null; then
                sudo yum install -y git
            elif command -v pacman >/dev/null; then
                sudo pacman-key --init
                sudo pacman-key --populate archlinux
                # Arch does not support partial upgrades, so sync and upgrade together.
                sudo pacman -Syu --needed --noconfirm git
            else
                echo "Package manager not recognized. Install git manually." >&2
                exit 1
            fi
            ;;
        Darwin)
            # git comes with Homebrew's Command Line Tools install.
            if ! command -v brew >/dev/null && [[ ! -x /opt/homebrew/bin/brew && ! -x /usr/local/bin/brew ]]; then
                echo "Installing Homebrew..."
                run_homebrew_installer
            fi
            # A fresh install is not on PATH yet in this shell.
            eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
            brew install git
            ;;
        *)
            echo "Unsupported operating system: $(uname -s)" >&2
            exit 1
            ;;
    esac
}

main() {
    install_git

    if [ -d "$CLONE_DIR" ]; then
        rm -rf "$CLONE_DIR"
    fi
    echo "Cloning the repository..."
    git clone "$REPO_URL" "$CLONE_DIR"

    echo "Running setup.sh from the repository..."
    "$CLONE_DIR/setup.sh"

    echo "Bootstrap completed successfully."
}

# Calling main last means bash has read the whole script before running any of it,
# which matters when the script arrives through a pipe.
main "$@"
