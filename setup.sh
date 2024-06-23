#!/bin/bash

# Install Rust
echo "(1 / 8) Installing common languages"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
. "$HOME/.cargo/env"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20

echo "(2 / 8) Installing zoxide"
curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
export PATH="$PATH:~/.local/bin"

echo "(3 / 8) Installing neovim"
curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
sudo rm -rf /opt/nvim
sudo tar -C /opt -xzf nvim-linux64.tar.gz
export PATH="$PATH:/opt/nvim-linux64/bin"

if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    echo "(4 / 8) Detected macOS, installing Homebrew..."
    # Install Homebrew
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Install stuff
    echo "Installing software..."
    brew install zsh vim stow fish neovim silicon ripgrep fzf python@3.12

elif [[ -f /etc/redhat-release ]]; then
    # Red Hat
    echo "(4 / 8) Detected Red Hat-based system, installing software..."
    sudo dnf install zsh vim stow fish python3-neovim cmake expat-devel fontconfig-devel libxcb-devel freetype-devel libxml2-devel harfbuzz ripgrep fzf
    cargo install silicon

elif [[ -f /etc/debian_version ]]; then
    # Debian
    echo "(4 / 8) Detected Debian-based system, installing software..."

    # Install zsh
    sudo apt update

    # Needed for silicon, the code screenshot tool
    sudo apt install -y expat libxml2-dev pkg-config libasound2-dev libssl-dev cmake libfreetype6-dev libexpat1-dev libxcb-composite0-dev libharfbuzz-dev fzf

    curl -LO https://github.com/BurntSushi/ripgrep/releases/download/14.1.0/ripgrep_14.1.0-1_amd64.deb
    sudo dpkg -i ripgrep_14.1.0-1_amd64.deb

    sudo apt install -y zsh vim build-essential git stow
    cargo install silicon
    
    # Install fish
    sudo apt-add-repository ppa:fish-shell/release-3
    sudo apt update
    sudo apt install -y fish
fi

# Install Starship
echo "(5 / 8) Installing Starship..."
curl -sS https://starship.rs/install.sh | sh

# Install Oh-My-Zsh
echo "(6 / 8) Installing Oh-My-Zsh..."
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Set up NvChad
echo "(7 / 8) Setting up NvChad..."
git clone https://github.com/NvChad/NvChad ~/.config/nvim --depth 1

# Set up dotfiles
echo "(8 / 8) Setting up dotfiles..."
mv ~/.zshrc ~/.zshrc.bak
rm ~/.config/nvim/.stylua.toml
stow .

if [ "$(uname)" = "Linux" ]; then
    echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.zshrc
    echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.config/fish/config.fish
fi
echo 'export PATH="$PATH:~/.local/bin"' >> ~/.zshrc
echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.config/fish/config.fish

echo "Done! Please restart your terminal."
