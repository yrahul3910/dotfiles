#!/bin/bash

if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    echo "(1/5) Detected macOS, installing Homebrew..."
    # Install Homebrew
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Install stuff
    echo "Installing software..."
    brew install zsh vim stow fish neovim

elif [[ -f /etc/redhat-release ]]; then
    # Red Hat
    echo "(1/5) Detected Red Hat-based system, installing software..."
    sudo dnf install zsh vim stow fish neovim python3-neovim

elif [[ -f /etc/debian_version ]]; then
    # Debian
    echo "(1/5) Detected Debian-based system, installing software..."

    # Install zsh
    sudo apt update
    sudo apt install -y zsh vim build-essential git stow neovim
    
    # Install fish
    sudo apt-add-repository ppa:fish-shell/release-3
    sudo apt update
    sudo apt install fish
fi

# Install Starship
echo "(2/5) Installing Starship..."
curl -sS https://starship.rs/install.sh | sh

# Install Oh-My-Zsh
echo "(3/5) Installing Oh-My-Zsh..."
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Set up NvChad
echo "(4/5) Setting up NvChad..."
git clone https://github.com/NvChad/NvChad ~/.config/nvim --depth 1 && nvim

# Set up dotfiles
echo "(5/5) Setting up dotfiles..."
stow .

echo "Done! Please restart your terminal."
