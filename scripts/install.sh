#!/usr/bin/env bash

echo "Create occ-tools cli aliases..."

current_app_dir=$(cd -P -- "$(dirname -- "$0")" && pwd -P)
occ_tools_alias_name="occ-tools"

#Files where all shell commands are placed
#Currently:
# .zshrc - for zsh
# config.fish - for fish shell
# .bashrc - for linux/macos
# .bash_profile - mainly for macos, but can be used on linux also
bashrc_files="
  $HOME/.zshrc
  $HOME/.config/fish/config.fish
  $HOME/.bashrc
  $HOME/.bash_profile
"

source_bashrc() {
  if [[ $1 != *"zsh"* ]]; then
    source "$1"
  fi
}

#create the alias of occ-tools into the bashrc
create_alias() {
  occ_tools_alias="
#OCC-TOOLS CLI START
alias ${occ_tools_alias_name}=\"${1}\"
alias ochelp=\"occ-tools help\"
alias ochelp=\"occ-tools help\"
alias ocupload=\"occ-tools upload\"  
alias ocdownload=\"occ-tools download\"  
alias ocgenerate=\"occ-tools generate\"  
alias ocpublish=\"occ-tools publish\"  
alias ocenv=\"occ-tools env\"  
alias ocproxy=\"occ-tools proxy\"  
alias ocbundler=\"occ-tools bundler\"  
alias octesting=\"occ-tools testing\"
#OCC-TOOLS CLI END
  "

  echo "${occ_tools_alias}" >> "$2"
  source_bashrc $2
}

#update the alias when it exists
update_alias() {
  occ_cli_file=$1
  alias_value_replace="${occ_tools_alias_name}=\"${occ_cli_file}\""

  sed -i -e 's|'"$occ_tools_alias_name"'=".*"|'"$alias_value_replace"'|g' $2
  source_bashrc $2
}

#manage the bashrc changes, updating or creating the aliases
init_bashrc_changes() {
  occ_cli_file=$1

  for bashrc_file in $bashrc_files
  do
     if [ -f $bashrc_file ]; then
      if grep -Rq "alias ${occ_tools_alias_name}" $bashrc_file; then
        update_alias $occ_cli_file "$bashrc_file"
        echo "updated current occ-tools alias on ${bashrc_file}"
      else
        create_alias $occ_cli_file "$bashrc_file"
        echo "created a new occ-tools alias on ${bashrc_file}"
      fi
    fi
  done

  echo "occ-tools cli has been successfully installed. Open any other terminal tab and type ${occ_tools_alias_name}"
}

#run this when macos
osx() {
  occ_cli_file="${current_app_dir}/occ-tools-cli"
  init_bashrc_changes "${occ_cli_file}"
}

#run this when linux
linux() {
  occ_cli_file="${current_app_dir}/occ-tools-cli"
  init_bashrc_changes "${occ_cli_file}"
}

case "$OSTYPE" in
  darwin*)  osx ;; 
  linux*)   linux ;;
  *)        echo "unknown: $OSTYPE" ;;
esac
