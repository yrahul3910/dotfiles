#!/bin/bash
set -ex

# Install Rust
echo "(1 / 6) Installing common utilities"
echo ">>> Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
. "$HOME/.cargo/env"

echo ">>> Installing Node, nvm, pnpm, and bun..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
curl -fsSL https://get.pnpm.io/install.sh | sh -

echo ">>> Installing Kitty..."
curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin

echo ">>> Installing Starship..."
curl -sS https://starship.rs/install.sh | sh

echo ">>> Installing zoxide"
curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
export PATH="$PATH:~/.local/bin"


if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    echo "(2 / 6) Detected macOS, installing software..."
    brew install zsh vim stow fish neovim silicon ripgrep fzf python@3.12

elif [[ -f /etc/redhat-release ]]; then
    # Red Hat
    echo "(3 / 6) Detected Red Hat-based system, installing software..."
    sudo dnf install zsh vim stow fish python3-neovim cmake expat-devel fontconfig-devel libxcb-devel freetype-devel libxml2-devel harfbuzz ripgrep fzf
    cargo install silicon

    echo ">>> Installing neovim"
    curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
    sudo rm -rf /opt/nvim
    sudo tar -C /opt -xzf nvim-linux64.tar.gz
    export PATH="$PATH:/opt/nvim-linux64/bin"
    echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.zshrc
    echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.config/fish/config.fish

elif [[ -f /etc/debian_version ]]; then
    # Debian
    echo "(4 / 6) Detected Debian-based system, installing software..."

    # Install zsh
    sudo apt update

    # Needed for silicon, the code screenshot tool
    sudo apt install -y expat libxml2-dev pkg-config libasound2-dev libssl-dev cmake libfreetype6-dev libexpat1-dev libxcb-composite0-dev libharfbuzz-dev fzf

    curl -LO https://github.com/BurntSushi/ripgrep/releases/download/14.1.0/ripgrep_14.1.0-1_amd64.deb
    sudo dpkg -i ripgrep_14.1.0-1_amd64.deb
    rm ripgrep*.deb

    sudo apt install -y zsh vim build-essential stow
    cargo install silicon

    sudo apt install -y python3-pip
    
    # Install fish
    sudo apt-add-repository ppa:fish-shell/release-3
    sudo apt update
    sudo apt install -y fish

    echo ">>> Installing neovim"
    curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
    sudo rm -rf /opt/nvim
    sudo tar -C /opt -xzf nvim-linux64.tar.gz
    export PATH="$PATH:/opt/nvim-linux64/bin"
    echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.zshrc
    echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.config/fish/config.fish
fi

echo ">>> Installing Poetry..."
curl -sSL https://install.python-poetry.org | python3 -

# Set up dotfiles
echo "(5 / 5) Setting up dotfiles..."

if [ -f ~/.zshrc ]; then
    mv ~/.zshrc ~/.zshrc.bak
fi

if [ -d ~/.config ]; then
    mv ~/.config ~/.config.bak
fi

stow .

echo 'export PATH="$PATH:~/.local/bin"' >> ~/.zshrc

echo "\n\n===================\nDone! Please restart your terminal.\n===================="
