#!/bin/sh
# Arayüzü bağımsız Tizen uygulaması (.wgt) olarak paketler.
# Çıkan dosya imzasızdır; TizenBrewInstaller "Select file to install" ile
# kurarken Samsung sertifikasıyla imzalar.
set -e
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/AnaEkran.wgt
zip -q -r -X dist/AnaEkran.wgt config.xml icon.png service.js app -x '*.DS_Store'
echo "dist/AnaEkran.wgt"
