#!/bin/bash

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    echo "(1/5) Detected macOS, installing Homebrew..."
    # Install Homebrew
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Install stuff
    echo "Installing software..."
    brew install zsh vim stow fish neovim silicon

elif [[ -f /etc/redhat-release ]]; then
    # Red Hat
    echo "(1/5) Detected Red Hat-based system, installing software..."
    sudo dnf install zsh vim stow fish neovim python3-neovim cmake expat-devel fontconfig-devel libxcb-devel freetype-devel libxml2-devel harfbuzz
    cargo install silicon


elif [[ -f /etc/debian_version ]]; then
    # Debian
    echo "(1/5) Detected Debian-based system, installing software..."

    # Install zsh
    sudo apt update

    # Needed for silicon, the code screenshot tool
    sudo apt install -y expat libxml2-dev pkg-config libasound2-dev libssl-dev cmake libfreetype6-dev libexpat1-dev libxcb-composite0-dev libharfbuzz-dev


    sudo apt install -y zsh vim build-essential git stow neovim
    cargo install silicon
    
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
