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

function mkcd
  mkdir -p $argv  # Create the directory (and parent directories if needed)
  cd $argv         # Change directory into the newly created one
end

alias gcloud=/Users/ryedida/Downloads/google-cloud-sdk/bin/gcloud
alias jupyter=/Users/ryedida/opt/anaconda3/bin/jupyter
alias arc-ssh="ssh -i ~/.ssh/ryedida arc.csc.ncsu.edu"
alias arc-scp="scp -i ~/.ssh/ryedida"
alias moss="~/moss.pl"
alias python3="python3.12"
alias python3arm="/opt/homebrew/Cellar/python@3.12/3.12.3/bin/python3"
alias pip3arm="/opt/homebrew/Cellar/python@3.12/3.12.3/bin/pip3"

starship init fish | source

zoxide init --cmd cd fish | source

eval "$(/opt/homebrew/bin/brew shellenv)"
