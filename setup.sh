#!/bin/bash
set -x

# Install Rust
echo ""
echo "(1 / 6) Installing common utilities"
echo ">>> Installing Rust..."
echo ""
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
. "$HOME/.cargo/env"

echo ""
echo ">>> Installing Node, nvm, pnpm, and bun..."
echo ""
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install 20
curl -fsSL https://get.pnpm.io/install.sh | sh -

echo ""
echo ">>> Installing Kitty..."
echo ""
curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin

echo ""
echo ">>> Installing Starship..."
echo ""
curl -sS https://starship.rs/install.sh | sh

echo ""
echo ">>> Installing zoxide"
echo ""
curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
export PATH="$PATH:~/.local/bin"


if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    echo ""
    echo "(2 / 6) Detected macOS, installing software..."
    echo ""
    brew install zsh vim stow fish neovim silicon ripgrep fzf python@3.12 yazi poppler zoxide bat

elif [[ -f /etc/redhat-release ]]; then
    # Red Hat
    echo ""
    echo "(3 / 6) Detected Red Hat-based system, installing software..."
    echo ""
    sudo dnf install -y zsh vim stow fish python3-neovim cmake expat-devel fontconfig-devel libxcb-devel freetype-devel libxml2-devel harfbuzz ripgrep fzf poppler yazi rust-bat
    sudo dnf install -y gcc gcc-c++ kernel-devel
    cargo install silicon

    echo ""
    echo ">>> Installing neovim"
    echo ""
    curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
    sudo rm -rf /opt/nvim
    sudo tar -C /opt -xzf nvim-linux64.tar.gz
    export PATH="$PATH:/opt/nvim-linux64/bin"

elif [[ -f /etc/arch-release ]]; then
    # Arch Linux
    echo ""
    echo "(4 / 6) Detected Arch-based system, installing software..."
    echo ""
    sudo pacman -Syu
    sudo pacman -S zsh vim stow fish neovim silicon ripgrep fzf poppler zoxide yazi bat

elif [[ -f /etc/debian_version ]]; then
    # Debian
    echo ""
    echo "(4 / 6) Detected Debian-based system, installing software..."
    echo ""

    # Install zsh
    sudo apt update

    cargo install --locked yazi-fm yazi-cli

    # Needed for silicon, the code screenshot tool
    sudo apt install -y expat libxml2-dev pkg-config libasound2-dev libssl-dev cmake libfreetype6-dev libexpat1-dev libxcb-composite0-dev libharfbuzz-dev fzf fontconfig

    curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh

    curl -LO https://github.com/BurntSushi/ripgrep/releases/download/14.1.0/ripgrep_14.1.0-1_amd64.deb
    sudo dpkg -i ripgrep_14.1.0-1_amd64.deb
    rm ripgrep*.deb

    sudo apt install -y zsh vim build-essential stow poppler rust-bat
    cargo install silicon

    sudo apt install -y python3-pip nala
    
    sudo apt install software-properties-common python3-launchpadlib
    sudo apt-add-repository ppa:fish-shell/release-3
    sudo apt update
    sudo apt install -y fish

fi

echo ""
echo ">>> Installing Poetry..."
echo ""
curl -sSL https://install.python-poetry.org | python3 -

# Set up dotfiles
echo ""
echo "(5 / 5) Setting up dotfiles..."
echo ""

if [ -f ~/.zshrc ]; then
    mv ~/.zshrc ~/.zshrc.bak
fi

if [ -d ~/.config ]; then
    mv ~/.config ~/.config.bak
fi

cd ~/configs && stow .

if [[ "$(uname)" == "Linux" ]]; then
  echo ""
  echo ">>> Installing neovim"
  echo ""
  curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
  sudo rm -rf /opt/nvim
  sudo tar -C /opt -xzf nvim-linux64.tar.gz
  export PATH="$PATH:/opt/nvim-linux64/bin"
  echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.zshrc
  echo 'export PATH="$PATH:/opt/nvim-linux64/bin"' >> ~/.config/fish/config.fish
fi

echo 'export PATH="$PATH:~/.local/bin"' >> ~/.zshrc
echo "\n\n===================\nDone! Please restart your terminal.\n===================="
