#!/usr/bin/env bash

curl -o master.zip -sSL https://github.com/yrahul3910/configs/archive/refs/heads/master.zip
unzip master.zip
cd configs-master
chmod +x ./setup.sh && ./setup.sh
