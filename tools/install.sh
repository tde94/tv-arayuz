#!/bin/sh
# Paketi derleyip TV'ye kurar. TizenBrewInstaller her kurulumdan sonra TV bağlantısını
# bıraktığı için program her seferinde yeniden başlatılır.
# Kullanım: tools/install.sh [TV_IP]
set -e
cd "$(dirname "$0")/.."
TV_IP="${1:-192.168.0.113}"
INSTALLER="$HOME/Downloads/tizenbrew/TizenBrewInstaller-macos-x64"
./build-wgt.sh
pkill -f TizenBrewInstaller-macos-x64 || true
sleep 2
(cd "$(dirname "$INSTALLER")" && "$INSTALLER" >/dev/null 2>&1 &)
sleep 3
node tools/install-wgt.js "$TV_IP" "$PWD/dist/AnaEkran.wgt" &
NODE_PID=$!
sleep 40
kill $NODE_PID 2>/dev/null || true
pkill -f TizenBrewInstaller-macos-x64 || true
