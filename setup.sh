#!/bin/bash
set -x

# Install Rust
echo ""
echo ">>> Installing Rust..."
echo ""
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
. "$HOME/.cargo/env"

# On macOS, Node is installed via the Brewfile
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo ""
    echo ">>> Installing Node and nvm..."
    echo ""
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
    nvm install 26
fi

# On macOS, Ghostty (installed via the Brewfile) replaces Kitty
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo ""
    echo ">>> Installing Kitty..."
    echo ""
    curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin
fi

echo ""
echo ">>> Installing Starship..."
echo ""
curl -sS https://starship.rs/install.sh | sh

# On macOS, zoxide is installed via the Brewfile
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo ""
    echo ">>> Installing zoxide"
    echo ""
    curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
    export PATH="$PATH:~/.local/bin"
fi

echo ""
echo ">>> Installing Poetry..."
echo ""
curl -sSL https://install.python-poetry.org | python3 -

echo ""
echo ">>> Installing uv..."
echo ""
curl -LsSf https://astral.sh/uv/install.sh | sh

if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    echo ""
    echo ">>> Detected macOS, installing software..."
    echo ""
    # Install Homebrew if not installed
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Install all macOS packages (brews, casks, Go & Cargo tools) from the Brewfile
    /opt/homebrew/bin/brew bundle --file="$HOME/configs/Brewfile"

elif [[ -f /etc/redhat-release ]]; then
    # Red Hat
    echo ""
    echo ">>> Detected Red Hat-based system, installing software..."
    echo ""
    sudo dnf install -y zsh vim stow fish python3-neovim cmake fontconfig-devel harfbuzz ripgrep fzf poppler yazi rust-bat git-delta
    sudo dnf install -y gcc gcc-c++ kernel-devel

    sudo dnf copr enable atim/lazygit -y
    sudo dnf install -y lazygit

elif [[ -f /etc/arch-release ]]; then
    # Arch Linux
    echo ""
    echo ">>> Detected Arch-based system, installing software..."
    echo ""
    sudo pacman -Syu
    sudo pacman -S zsh vim stow fish neovim ripgrep fzf poppler zoxide yazi bat git-delta lazygit

elif [[ -f /etc/debian_version ]]; then
    # Debian
    echo ""
    echo ">>> Detected Debian-based system, installing software..."
    echo ""

    sudo apt update

    cargo install --locked yazi-fm yazi-cli

    curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh

    sudo apt-get install -y zsh vim build-essential stow poppler rust-bat ripgrep python3-pip git-delta

    LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
    curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
    tar xf lazygit.tar.gz lazygit
    sudo install lazygit /usr/local/bin

    sudo apt install software-properties-common python3-launchpadlib
    sudo apt-add-repository ppa:fish-shell/release-3
    sudo apt update
    sudo apt install -y fish
fi

# On macOS, tree-sitter-cli is installed via the Brewfile
if [[ "$(uname -s)" != "Darwin" ]]; then
    cargo install --locked tree-sitter-cli
fi

# Set up dotfiles
echo ""
echo ">>> Setting up dotfiles..."
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
else
  gsettings set org.gnome.desktop.interface clock-show-weekday true
fi

echo 'export PATH="$PATH:~/.local/bin"' >> ~/.zshrc

cp tmux-sessionizer /usr/local/bin

# On macOS, VS Code does not follow XDG conventions
if defaults read com.apple.finder &>/dev/null; then
    mkdir -p ~/Library/Application\ Support/Code/User
    cp .config/Code/*.json ~/Library/Application\ Support/Code/User/settings.json
fi

./setup-macos-defaults.sh

chsh -s $(which zsh) $(whoami)

echo "\n\n===================\nDone! Please restart your terminal.\n===================="
