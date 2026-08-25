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

set -gx HOMEBREW_NO_AUTO_UPDATE 1

set -x RUSTC_WRAPPER sccache
set -x ELECTRON_OZONE_PLATFORM_HINT auto
set -x PYTHONSTARTUP ~/.pythonrc
set -gx QT_QPA_PLATFORM wayland

fish_vi_key_bindings

# Enable command history search via fzf
function reverse_history_search
  history | fzf --no-sort | read -l command
  if test $command
    commandline -rb $command
  end
end

# Usage: `prdiff origin/main..HEAD -- .`
function prdiff
  git --no-pager diff --word-diff=color --word-diff-regex="[A-Za-z0-9_]+|[^A-Za-z0-9_[:space:]]" $argv
end

function fish_user_key_bindings
  bind -M normal / reverse_history_search
  bind -M insert ctrl-y accept-autosuggestion
end

function mkcd
  mkdir -p $argv  # Create the directory (and parent directories if needed)
  cd $argv         # Change directory into the newly created one
end

function up --description "Move up directory tree by N levels (default: 1)"
  set -l count 1

  if test (count $argv) -gt 0
    and string match -qr '^\d+$' $argv[1]
    set count $argv[1]
  end

  set -l path "./"
  for i in (seq $count)
    set path "$path../"
  end

  cd $path
end

function so
  source $HOME/.config/fish/config.fish
end

function envsource
  for line in (cat $argv | grep -v '^#' | grep -v '^\s*$')
    set item (string split -m 1 '=' $line)
    set -gx $item[1] $item[2]
    echo "Exported key $item[1]"
  end
end

function copyenv --description "Load encrypted secrets into this shell"
    for f in ~/configs/secrets/*.env
        source (sops -d $f | psub)
    end
    echo "Secrets loaded."
end

function yy
  set tmp (mktemp -t "yazi-cwd.XXXXXX")
  yazi $argv --cwd-file="$tmp"
  if set cwd (cat -- "$tmp"); and [ -n "$cwd" ]; and [ "$cwd" != "$PWD" ]
    cd -- "$cwd"
  end
  rm -f -- "$tmp"
end

function tl
  sed -i --follow-symlinks -e "s/dark.conf/light.conf/g" ~/.config/kitty/kitty.conf 
  sed -i --follow-symlinks -e "s/GitHub Dark Default/Atom One Light/g" ~/.config/ghostty/config
  sed -i --follow-symlinks -e "s/status-bg default/status-bg white/g" ~/.tmux.conf
  sed -i --follow-symlinks -e "s/status-fg white/status-fg black/g" ~/.tmux.conf
  tmux source-file ~/.tmux.conf
end

function td
  sed -i --follow-symlinks -e "s/light.conf/dark.conf/g" ~/.config/kitty/kitty.conf 
  sed -i --follow-symlinks -e "s/Atom One Light/GitHub Dark Default/g" ~/.config/ghostty/config
  sed -i --follow-symlinks -e "s/status-bg white/status-bg default/g" ~/.tmux.conf
  sed -i --follow-symlinks -e "s/status-fg black/status-fg white/g" ~/.tmux.conf
  tmux source-file ~/.tmux.conf
end

alias pio="pi --offline"
alias gcloud=$HOME/Downloads/google-cloud-sdk/bin/gcloud
alias gsutil=$HOME/Downloads/google-cloud-sdk/bin/gcloud
alias lg=lazygit
alias diff=delta
alias moss="~/moss.pl"
alias '...'='cd ../../'
alias l="ls --color=auto"
alias ll="ls -l --color=auto"
alias ls="ls --color=auto"
alias olls="OLLAMA_FLASH_ATTENTION='1' OLLAMA_KV_CACHE_TYPE='q8_0' ollama serve"

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
direnv hook fish | source

# Python being Python
set -x PYTHONPATH $PYTHONPATH .

# bun
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH

set -x PATH $HOME/.local/bin $PATH
set -x PATH $HOME/go/bin $PATH

set -gx GPG_TTY (tty)
set -gx SOPS_AGE_KEY_FILE ~/.config/sops/age/keys.txt
