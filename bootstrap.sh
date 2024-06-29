#!/bin/bash
set -ex

# Define the Git repository URL
REPO_URL="https://github.com/yrahul3910/configs/"

# Define the directory where the repository will be cloned
CLONE_DIR="$HOME/configs"

# Check for OS type and install git if it is not already installed
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # For Debian/Ubuntu-based systems
    if command -v apt-get >/dev/null; then
        sudo apt-get update
        sudo apt-get install -y git
    # For RHEL-based systems
    elif command -v yum >/dev/null; then
        sudo yum update
        sudo yum install -y git
    else
        echo "Package manager not recognized. Install git manually."
        exit 1
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if Homebrew is installed
    if ! command -v brew >/dev/null; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    # Install git using Homebrew
    brew install git
else
    echo "Unsupported OS type: $OSTYPE"
    exit 1
fi

# Clone the repository
if [ -d "$CLONE_DIR" ]; then
    rm -rf "$CLONE_DIR"

echo "Cloning the repository..."
git clone "$REPO_URL" "$CLONE_DIR"

# Check if the setup.sh script exists and is executable
SETUP_SCRIPT="$CLONE_DIR/setup.sh"
if [ -f "$SETUP_SCRIPT" ]; then
    chmod +x "$SETUP_SCRIPT"
    echo "Running setup.sh from the repository..."
    "$SETUP_SCRIPT"
else
    echo "setup.sh not found in the repository. Exiting..."
    exit 1
fi

echo "Bootstrap completed successfully."
