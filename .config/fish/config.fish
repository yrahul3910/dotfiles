if test -n "$GHOSTTY_RESOURCES_DIR"
    source "$GHOSTTY_RESOURCES_DIR/shell-integration/fish/vendor_conf.d/ghostty-shell-integration.fish"
end

bind \cd true  # nop

# Fish syntax highlighting
set -g fish_color_autosuggestion '555'  'brblack'
set -g fish_color_cancel -r
set -g fish_color_command --bold
set -g fish_color_comment red
set -g fish_color_cwd green
set -g fish_color_cwd_root red
set -g fish_color_end brmagenta
set -g fish_color_error brred
set -g fish_color_escape 'bryellow'  '--bold'
set -g fish_color_history_current --bold
set -g fish_color_host normal
set -g fish_color_match --background=brblue
set -g fish_color_directory yellow
set -g fish_color_normal normal
set -g fish_color_operator bryellow
set -g fish_color_param cyan
set -g fish_color_quote yellow
set -g fish_color_redirection brblue
set -g fish_color_search_match 'bryellow'  '--background=brblack'
set -g fish_color_selection 'white'  '--bold'  '--background=brblack'
set -g fish_color_user brgreen
set -g fish_color_valid_path --underline

set -x PATH $PATH /opt/homebrew/bin
set -x PATH $PATH /usr/local/go/bin
set -x PATH $PATH /Applications/Ghostty.app/Contents/MacOS/

set -U HOMEBREW_NO_AUTO_UPDATE 1

fish_vi_key_bindings

# Enable command history search via fzf
function reverse_history_search
  history | fzf --no-sort | read -l command
  if test $command
    commandline -rb $command
  end
end

function fish_user_key_bindings
  bind -M default / reverse_history_search
  bind -M user \cy accept-autosuggestion
end

function mkcd
  mkdir -p $argv  # Create the directory (and parent directories if needed)
  cd $argv         # Change directory into the newly created one
end

function yy
  set tmp (mktemp -t "yazi-cwd.XXXXXX")
  yazi $argv --cwd-file="$tmp"
  if set cwd (cat -- "$tmp"); and [ -n "$cwd" ]; and [ "$cwd" != "$PWD" ]
    cd -- "$cwd"
  end
  rm -f -- "$tmp"
end

alias gcloud=$HOME/Downloads/google-cloud-sdk/bin/gcloud
alias gsutil=$HOME/Downloads/google-cloud-sdk/bin/gcloud
alias lg=lazygit
alias diff=delta
alias moss="~/moss.pl"
alias '...'='cd ../../'
alias l="ls --color=auto"
alias ll="ls -l --color=auto"
alias ls="ls --color=auto"
alias tl="sed -i --follow-symlinks -e s/dark.conf/light.conf/g ~/.config/kitty/kitty.conf && \
    sed -i --follow-symlinks -e s/rose-pine/AtomOneLight/g ~/.config/ghostty/config"
alias td="sed -i --follow-symlinks -e s/light.conf/dark.conf/g ~/.config/kitty/kitty.conf && \
    sed -i --follow-symlinks -e s/AtomOneLight/rose-pine/g ~/.config/ghostty/config"

if string match -q "Darwin" -- (uname)
    alias python3arm="/opt/homebrew/Cellar/python@3.13/3.13.*/bin/python3"
    alias pip3arm="/opt/homebrew/Cellar/python@3.13/3.13.*/bin/pip3"
    alias brewarm="/opt/homebrew/bin/brew"
    alias condaarm="/opt/homebrew/bin/conda"
    alias sed="gsed"

    if test -f /opt/homebrew/bin/brew
      eval "$(/opt/homebrew/bin/brew shellenv)"
    end
end

starship init fish | source

zoxide init --cmd cd fish | source

