#!/usr/bin/env python3

import argparse
import subprocess
import yaml
import sys
import os
import platform
from typing import Optional, List

class PackageManager:
    def __init__(self):
        self.system = platform.system()
        if self.system == "Darwin":
            self.type = "brew"
            self.install_cmd = "brew install"
            self.update_cmd = "brew update"
        elif self.system == "Linux":
            # Detect Linux distribution
            if os.path.exists("/etc/arch-release"):
                self.system = "arch"
                self.install_cmd = "sudo pacman -S --noconfirm"
                self.update_cmd = "sudo pacman -Sy"
            elif os.path.exists("/etc/debian_version"):
                self.system = "debian"
                self.install_cmd = "sudo apt-get install -y"
                self.update_cmd = "sudo apt-get update"
            elif os.path.exists("/etc/fedora-release") or os.path.exists("/etc/redhat-release"):
                self.system = "rhel"
                self.install_cmd = "sudo dnf install -y"
                self.update_cmd = "sudo dnf check-update"
            else:
                raise OSError("Unsupported Linux distribution")
        else:
            raise OSError(f"Unsupported operating system: {self.system}")

class DotfilesInstaller:
    def __init__(self):
        self.pkg_mgr = PackageManager()
        self.config = yaml.safe_load(open("install.yaml", "r"))

    def run_command(self, command: str) -> None:
        """Execute a shell command and handle errors."""
        try:
            subprocess.run(command, shell=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error executing command: {command}")
            print(f"Error details: {e}")
            sys.exit(1)

    def list_features(self) -> None:
        """Display available features and their descriptions."""
        print("\nAvailable features:")
        features = self.config["features"]
        for feature in features:
            deps = ", ".join(feature["dependencies"]) if "dependencies" in features else "none"
            print(f"\n{feature['name']}:")
            print(f"  Description: {feature.get('description', 'None')}")
            print(f"  Dependencies: {deps}")

    def get_dependencies(self, feature: str, accumulated: Optional[List[str]] = None) -> List[str]:
        """Recursively get all dependencies for a feature."""
        if accumulated is None:
            accumulated = []
        
        features = self.config["features"]
        feature_names = [f["name"] for f in features]
        if feature not in feature_names:
            print(f"Unknown feature: {feature}")
            sys.exit(1)
            
        cur_feature = [f for f in features if f["name"] == feature][0]
        dependencies = cur_feature["dependencies"] if "dependencies" in cur_feature else []
        for dep in dependencies:
            if dep not in accumulated:
                self.get_dependencies(dep, accumulated)
                accumulated.append(dep)
                
        if feature not in accumulated:
            accumulated.append(feature)
            
        return accumulated

    def _install_feature(self, name: str) -> None:
        feature = [f for f in self.config["features"] if f["name"] == name]

        if not feature:
            print(f"Error: feature {name} not found")
            sys.exit(1)

        feature = feature[0]

        print(f">>> Installing feature {name}\n")

        if feature["installer"] == "bash":
            self.run_command(feature["cmd"])
        elif feature["installer"] == "system":
            if self.pkg_mgr.system not in feature["packages"]:
                print(f"{self.pkg_mgr.system} not in {name}.packages, nothing to do.")
            else:
                packages = " ".join(feature["packages"][self.pkg_mgr.system])
                self.run_command(f"{self.pkg_mgr.install_cmd} {packages}")
        else:
            print(f"Error: feature['installer'] = {feature['installer']} is invalid.")
            sys.exit(1)
            
        if "post_install" in feature:
            if self.pkg_mgr.system in feature["post_install"]:
                for cmd in feature["post_install"][self.pkg_mgr.system]:
                    self.run_command(cmd)

    def install_feature(self, name: str) -> None:
        features_to_install = self.get_dependencies(name)

        for feature in features_to_install:
            self._install_feature(feature)


    def _check_condition(self, condition) -> bool:
        if "platform" in condition:
            return self.pkg_mgr.system == condition["platform"]
        raise ValueError(f"Post-feature condition {condition} is unsupported.")
    

    def post_features(self) -> None:
        if "post_features" not in self.config:
            return

        for item in self.config["post_features"]:
            if "conditions" in item:
                if not all([self._check_condition(condition) for condition in item["conditions"]]):
                    continue

            for cmd in item["cmd"]:
                self.run_command(cmd)



def main():
    parser = argparse.ArgumentParser(description="Modular dotfiles installer")
    parser.add_argument("--list", action="store_true", help="List available features")
    parser.add_argument("--install", nargs="+", help="Features to install")
    
    args = parser.parse_args()
    installer = DotfilesInstaller()
    
    if args.list:
        installer.list_features()
        return
        
    if args.install:
        for feature in args.install:
            installer.install_feature(feature)

        installer.post_features()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
