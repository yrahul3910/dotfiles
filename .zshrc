if [[ -n $GHOSTTY_RESOURCES_DIR ]]; then
    autoload -Uz -- "$GHOSTTY_RESOURCES_DIR"/shell-integration/zsh/ghostty-integration
    ghostty-integration
    unfunction ghostty-integration
fi

setopt ignoreeof  # for tmux + karabiner

# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export PATH="$HOME/.cargo/bin":$PATH
export PATH="/Applications/Ghostty.app/Contents/MacOS/":$PATH

export ELECTRON_OZONE_PLATFORM_HINT=auto

if [ "$(uname)" = "Darwin" ]; then
    export HOMEBREW_NO_AUTO_UPDATE=1
    export PATH=$PATH:/opt/local/bin:/opt/homebrew/bin
fi

function mkcd () {
  mkdir -p $1  # Create the directory structure 
  cd $1        # Change into the new directory
}

function yy() {
    local tmp="$(mktemp -t "yazi-cwd.XXXXXX")"
    yazi "$@" --cwd-file="$tmp"
    if cwd="$(cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
	builtin cd -- "$cwd"
    fi
    rm -f -- "$tmp"
}

function up() {
    local count=${1:-1}
    # Check if the argument is a positive integer
    if [[ ! "$count" =~ ^[0-9]+$ ]]; then
        count=1
    fi
    
    local path="./"
    for ((i=1; i<=$count; i++)); do
        path="${path}../"
    done
    
    cd $path
}

function so() {
    source $HOME/.zshrc
}

alias mongod="mongod --dbpath=~/data/db"
alias l="ls --color=auto"
alias ll="ls -l --color=auto"
alias ls="ls --color=auto"
alias lg="lazygit"
alias diff="delta"
alias claude="$HOME/.claude/local/claude"
alias '...'='cd ../../'
alias olls="OLLAMA_FLASH_ATTENTION='1' OLLAMA_KV_CACHE_TYPE='q8_0' ollama serve"

if [ "$(uname)" = "Darwin" ]; then
    alias python3="python3.13"
    alias python3arm="/opt/homebrew/Cellar/python@3.13/3.13.*/bin/python3"
    alias pip3arm="/opt/homebrew/Cellar/python@3.13/3.13.*/bin/pip3"
    alias brewarm="/opt/homebrew/bin/brew"
    alias condaarm="/opt/homebrew/bin/conda"
    alias pip3="python3.13 -m pip"
    alias sed="gsed"
fi

function tl() {
  sed -i --follow-symlinks -e "s/dark.conf/light.conf/g" ~/.config/kitty/kitty.conf 
  sed -i --follow-symlinks -e "s/Rose Pine/Atom One Light/g" ~/.config/ghostty/config
  sed -i --follow-symlinks -e "s/status-bg black/status-bg white/g" ~/.tmux.conf
  sed -i --follow-symlinks -e "s/status-fg white/status-fg black/g" ~/.tmux.conf
  tmux source-file ~/.tmux.conf
}

function td() {
  sed -i --follow-symlinks -e "s/light.conf/dark.conf/g" ~/.config/kitty/kitty.conf 
  sed -i --follow-symlinks -e "s/Atom One Light/Rose Pine/g" ~/.config/ghostty/config
  sed -i --follow-symlinks -e "s/status-bg white/status-bg black/g" ~/.tmux.conf
  sed -i --follow-symlinks -e "s/status-fg black/status-fg white/g" ~/.tmux.conf
  tmux source-file ~/.tmux.conf
}

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment the following line to disable bi-weekly auto-update checks.
# DISABLE_AUTO_UPDATE="true"

# Uncomment the following line to automatically update without prompting.
# DISABLE_UPDATE_PROMPT="true"

# Uncomment the following line to change how often to auto-update (in days).
# export UPDATE_ZSH_DAYS=13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)

# vim bindings
bindkey -v
bindkey -v '^?' backward-delete-char
bindkey ^R history-incremental-search-backward

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
export PATH="$PATH:~/.config/emacs/bin"
export PATH="$PATH:/usr/local/go/bin"

# >>> conda initialize >>>
# !! Contents within this block are managed by 'conda init' !!
__conda_setup="$('/opt/homebrew/Caskroom/miniconda/base/bin/conda' 'shell.zsh' 'hook' 2> /dev/null)"
if [ $? -eq 0 ]; then
    eval "$__conda_setup"
else
    if [ -f "/opt/homebrew/Caskroom/miniconda/base/etc/profile.d/conda.sh" ]; then
        . "/opt/homebrew/Caskroom/miniconda/base/etc/profile.d/conda.sh"
    else
        export PATH="/opt/homebrew/Caskroom/miniconda/base/bin:$PATH"
    fi
fi
unset __conda_setup
# <<< conda initialize <<<

zstyle ':completion:*' completer _complete _ignored _expand_alias
autoload -Uz compinit
compinit

# Initialize zoxide if it exists
if command -v zoxide > /dev/null; then
  eval "$(zoxide init --cmd cd zsh)"
fi

# Check that the function `starship_zle-keymap-select()` is defined.
# xref: https://github.com/starship/starship/issues/3418
type starship_zle-keymap-select >/dev/null || \
  {
    echo "Load starship"
    eval "$(/usr/local/bin/starship init zsh)"
  }

# bun completions
[ -s "/Users/yedidar/.bun/_bun" ] && source "/Users/yedidar/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"


. "$HOME/.cargo/env"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
