# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH="/Users/ryedida/.oh-my-zsh"
export PATH="/Users/ryedida/Downloads/mongodb-macos-x86_64-4.4.0/bin":$PATH
export PATH="/Users/ryedida/Documents/apache-maven-3.6.3/bin":$PATH
export PATH="/Users/ryedida/Downloads/clangd_10.0.0/bin":$PATH
export PATH="/Library/PostgreSQL/13/bin":$PATH
export PATH="/Users/ryedida/Downloads/google-cloud-sdk/bin":$PATH
export PATH="/usr/local/mysql-8.0.26-macos11-arm64/bin":$PATH
export PATH="$HOME/.cargo/bin":$PATH
export PATH="/usr/local/monit/bin:$PATH"

export HOMEBREW_NO_AUTO_UPDATE=1
export VCPKG_ROOT=/Users/ryedida/Documents/vcpkg
export PATH=$VCPKG_ROOT:$PATH
export PATH=$PATH:/opt/local/bin

# ANTLR-specific stuff
export CLASSPATH=".:/usr/local/lib/antlr-4.9.2-complete.jar:$CLASSPATH"
export MSBuildSDKsPath="/usr/local/share/dotnet/sdk/7.0.102/Sdks"
alias antlr4='java -Xmx500M -cp "/usr/local/lib/antlr-4.9-complete.jar:$CLASSPATH" org.antlr.v4.Tool'
alias grun='java -Xmx500M -cp "/usr/local/lib/antlr-4.9-complete.jar:$CLASSPATH" org.antlr.v4.gui.TestRig'

alias mongod="mongod --dbpath=~/data/db"
alias python3="python3.12"
alias pip3="python3.12 -m pip"
alias arc-ssh="ssh -i ~/.ssh/ryedida arc.csc.ncsu.edu"
alias arc-scp="scp -i ~/.ssh/ryedida"
alias moss="~/moss.pl"
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

source $ZSH/oh-my-zsh.sh

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

alias ngrok=/Users/ryedida/Documents/ngrok

PATH="/Users/ryedida/perl5/bin${PATH:+:${PATH}}:i/Users/ryedida/Downloads/clangd_10.0.0/bin:/Users/ryedida/git-cinnabar"; export PATH;
PERL5LIB="/Users/ryedida/perl5/lib/perl5${PERL5LIB:+:${PERL5LIB}}"; export PERL5LIB;
PERL_LOCAL_LIB_ROOT="/Users/ryedida/perl5${PERL_LOCAL_LIB_ROOT:+:${PERL_LOCAL_LIB_ROOT}}"; export PERL_LOCAL_LIB_ROOT;
PERL_MB_OPT="--install_base \"/Users/ryedida/perl5\""; export PERL_MB_OPT;
PERL_MM_OPT="INSTALL_BASE=/Users/ryedida/perl5"; export PERL_MM_OPT;
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
export PATH="$PATH:/Users/ryedida/Desktop/menzies/mono2micro/mono2micro/our-approach/snap/examples/node2vec/"
export PATH="$PATH:~/.config/emacs/bin"

# >>> conda initialize >>>
# !! Contents within this block are managed by 'conda init' !!
__conda_setup="$('/Users/ryedida/mambaforge/bin/conda' 'shell.zsh' 'hook' 2> /dev/null)"
if [ $? -eq 0 ]; then
    eval "$__conda_setup"
else
    if [ -f "/Users/ryedida/mambaforge/etc/profile.d/conda.sh" ]; then
        . "/Users/ryedida/mambaforge/etc/profile.d/conda.sh"
    else
        export PATH="/Users/ryedida/mambaforge/bin:$PATH"
    fi
fi
unset __conda_setup

if [ -f "/Users/ryedida/mambaforge/etc/profile.d/mamba.sh" ]; then
    . "/Users/ryedida/mambaforge/etc/profile.d/mamba.sh"
fi
# <<< conda initialize <<<

autoload -U +X bashcompinit && bashcompinit
complete -o nospace -C /usr/local/bin/terraform terraform

