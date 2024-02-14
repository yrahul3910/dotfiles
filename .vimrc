set nocompatible              " be iMproved, required
set mouse=a
set splitbelow
set shell=/bin/bash
filetype off                  " required
" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()
" alternatively, pass a path where Vundle should install plugins
"call vundle#begin('~/some/path/here')


" let Vundle manage Vundle, required
Plugin 'VundleVim/Vundle.vim'
Plugin 'dense-analysis/ale'
Plugin 'tell-k/vim-autopep8'
Plugin 'vim-airline/vim-airline'
Plugin 'scrooloose/nerdtree'
Plugin 'valloric/youcompleteme'
Plugin 'ap/vim-buftabline'
Plugin 'rust-lang/rust.vim'
autocmd vimenter * NERDTree
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTree") && b:NERDTree.isTabTree()) | q | endif
" The following are examples of different formats supported.
" Keep Plugin commands between vundle#begin/end.
" plugin on GitHub repo
Plugin 'tpope/vim-fugitive'
set statusline="%{FugitiveStatusline()}"
let g:airline#extensions#ale#enabled = 1
let g:ale_fix_on_save = 1

let g:ale_linters = {"javascript": ["eslint"], "markdown": ["remark-lint"]}

" All of your Plugins must be added before the following line
call vundle#end()            " required
filetype plugin indent on    " required
" To ignore plugin indent changes, instead use:
"filetype plugin on
let g:autopep8_on_save = 1
let g:autopep8_disable_show_diff=1
let g:ycm_clangd_binary_path = "/Users/ryedida/Downloads/clangd_10.0.0/bin/clangd"
let g:ycm_confirm_extra_conf=0
set backspace=indent,eol,start
nnoremap <silent> <S-d> :YcmCompleter GoTo<CR>
nnoremap <silent> <S-t> :YcmCompleter GetType<CR>
nnoremap <silent> <S-f> :YcmCompleter GetDoc<CR>

nnoremap <C-N> :bnext<CR>
nnoremap <C-P> :bprev<CR>

nmap <F8> <Plug>(ale_fix)

autocmd FileType python noremap <buffer> <F8> :call Autopep8()<CR>

packadd! onedark.vim
" Brief help
" :PluginList       - lists configured plugins
" :PluginInstall    - installs plugins; append `!` to update or just :PluginUpdate
" :PluginSearch foo - searches for foo; append `!` to refresh local cache
" :PluginClean      - confirms removal of unused plugins; append `!` to auto-approve removal
"
" see :h vundle for more details or wiki for FAQ
" Put your non-Plugin stuff after this line

"Use 24-bit (true-color) mode in Vim/Neovim when outside tmux.
"If you're using tmux version 2.2 or later, you can remove the outermost $TMUX check and use tmux's 24-bit color support
"(see < http://sunaku.github.io/tmux-24bit-color.html#usage > for more information.)
let $NVIM_TUI_ENABLE_TRUE_COLOR=1
  "For Neovim > 0.1.5 and Vim > patch 7.4.1799 < https://github.com/vim/vim/commit/61be73bb0f965a895bfb064ea3e55476ac175162 >
  "Based on Vim patch 7.4.1770 (`guicolors` option) < https://github.com/vim/vim/commit/8a633e3427b47286869aa4b96f2bfc1fe65b25cd >
  " < https://github.com/neovim/neovim/wiki/Following-HEAD#20160511 >
"set termguicolors

syntax on
colorscheme onedark

set number autoindent
syntax on
filetype plugin indent on
set tabstop=4 shiftwidth=4 expandtab
set noerrorbells
set belloff=all

set foldmethod=indent
set foldnestmax=10
set nofoldenable
set foldlevel=2
