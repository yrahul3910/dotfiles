#!/usr/bin/env bash

# Mac OS X NSUserDefaults modifications
# Some based on https://github.com/mathiasbynens/dotfiles/blob/master/.osx
if defaults read com.apple.finder &>/dev/null; then
    # Keyboard: Disable autocorrect
    defaults write -g NSAutomaticSpellingCorrectionEnabled -bool false

    # Keyboard: Disable auto-capitalization
    defaults write -g NSAutomaticCapitalizationEnabled -bool false

    # Keyboard: Set a shorter Delay until key repeat
    defaults write -g InitialKeyRepeat -int 25
    defaults write -g KeyRepeat -int 2

    # Finder: Show all extenions
    defaults write -g AppleShowAllExtensions -bool true

    # Global: Save to disk (not to iCloud) by default
    defaults write -g NSDocumentSaveNewDocumentsToCloud -bool false

    # Global: Disable smart quotes as they’re annoying when typing code
    defaults write -g NSAutomaticQuoteSubstitutionEnabled -bool false

    # Global: Disable smart dashes as they’re annoying when typing code
    defaults write -g NSAutomaticDashSubstitutionEnabled -bool false

    # Finder: Show ~/Library in finder
    chflags nohidden ~/Library

    # Trackpad: enable tap to click for this user and for the login screen
    defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking -int 1
    defaults write com.apple.AppleMultitouchTrackpad Clicking -int 1
    defaults -currentHost write -g com.apple.mouse.tapBehavior -int 1
    defaults write -g com.apple.mouse.tapBehavior -int 1

    # Global: Use scroll gesture with the Ctrl (^) modifier key to zoom
    defaults write com.apple.universalaccess closeViewScrollWheelToggle -bool true
    defaults write com.apple.universalaccess HIDScrollZoomModifierMask -int 262144

    # Printer: Automatically quit printer app once the print jobs complete
    defaults write com.apple.print.PrintingPrefs "Quit When Finished" -bool true

    # Finder: Show Status bar in Finder
    defaults write com.apple.finder ShowStatusBar -bool true

    # Finder: Show icons for hard drives, servers, and removable media on the desktop
    defaults write com.apple.finder ShowExternalHardDrivesOnDesktop -bool true
    defaults write com.apple.finder ShowHardDrivesOnDesktop -bool true
    defaults write com.apple.finder ShowMountedServersOnDesktop -bool true

    # Dock: Disable recents
    defaults write com.apple.dock show-recents -bool false

    # Screenshot: Save screenshots with date in filename
    defaults write com.apple.screencapture include-date -bool true

    # Bottom right screen corner → Desktop
    defaults write com.apple.dock wvous-br-corner -int 4
    # Top left corner -> Mission Control
    defaults write com.apple.dock wvous-tl-corner -int 2

    # Spotlight: don't send stuff to apple
    defaults write com.apple.lookup lookupEnabled -dict-add suggestionsEnabled -bool no

    # Terminal: new tabs use default profile and CWD
    defaults write com.apple.Terminal NewTabSettingsBehavior -int 1
    defaults write com.apple.Terminal NewTabWorkingDirectoryBehavior -int 1

    # Spotlight: Don't index mounted volumes
    sudo defaults write /.Spotlight-V100/VolumeConfiguration Exclusions -array /Volumes

