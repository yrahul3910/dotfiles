export PATH="/usr/local/opt/python/libexec/bin:$PATH"
source "$HOME/.cargo/env"
. "$HOME/.cargo/env"
alias python3="python3.12"

[[ -f ~/.bash-preexec.sh ]] && source ~/.bash-preexec.sh
eval "$(atuin init bash)"

. "$HOME/.local/bin/env"

# Added by LM Studio CLI (lms)
export PATH="$PATH:/Users/ryedida/.lmstudio/bin"
# End of LM Studio CLI section

export PATH=$PATH:$HOME/Downloads/google-cloud-sdk/bin/

eval "$(zoxide init bash)"

# Added by Antigravity CLI installer
export PATH="/Users/ryedida/.local/bin:$PATH"
