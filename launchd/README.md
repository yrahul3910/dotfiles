This is a `launchd` script that periodically checks for changes in `~/Downloads` and removes the stupid quarantine bit macOS puts on it. 

> [!WARNING]
> Don't use this if you don't understand what exactly it does. This specifically bypasses Gatekeeper, one of macOS' security measures.

> [!WARNING]
> This can sometimes cause system freees if a newly-installed app launches and asks for permissions. This can happen if this is misconfigured to send too many requests to `tccd`, which effectively processes requests one at a time. `tccd` waits for you to click one of Allow or Don't Allow, which are processed by `WindowServer`, which has to send the click to `tccd` synchronously. This closes a deadlock cycle.

To set it up:

* **Set up a quarantined bash:** We'll give it Full Disk Access, so we won't use `/bin/bash`:

```sh
cp /bin/bash ~/.local/bin/quarantine-bash
codesign --force --sign - ~/.local/bin/quarantine-bash
```

* **Set up the script:** I prefer using symlinks:

```sh
chmod +x ~/configs/launchd/strip-quarantine.sh
ln -s $HOME/configs/launchd/strip-quarantine.sh $HOME/.local/bin/strip-quarantine.sh
```

You should customize the script and the plist file for the watched directories. I also have `-maxdepth 1`, because that's how I use my computer (this only limits it to the directories, and doesn't recurse, which also makes it a bit faster).

* **Give Full Disk Access to the interpreter:** Downloads is a folder protected by TCC (Transparency, Consent, and Control)--ironic because I had to do this stupid hack to control my own computer--but this is why you need Full Disk Access, because `find` will fail with `Operation not Permitted`. Open System Settings → Privacy & Security → Full Disk Access, click +, and in the file picker press Cmd-Shift-G and paste:

```
/Users/ryedida/.local/bin/quarantine-bash
```

This should also be resilient to macOS updates, since the signed interpreter here doesn't change with macOS.

* **Set up the daemon:** 

```sh
cp launchd/com.user.stripquarantine.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.user.stripquarantine.plist
```

* **Test:**

```sh
touch /tmp/test.txt
xattr -w com.apple.quarantine "0000;00000000;Test;" /tmp/test.txt
mv /tmp/test.txt ~/Downloads/test.txt
sleep 60
xattr -l ~/Downloads/test.txt   # should print nothing now
rm ~/Downloads/test.txt
```

While you're at it, you probably also want this, which disables the other popup that commonly shows up.

```sh
sudo spctl --master-enable
sudo defaults write com.apple.LaunchServices LSQuarantine -bool true
```

