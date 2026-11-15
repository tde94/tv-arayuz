#!/usr/bin/env python3
"""Diziler arşivini önceden hazırlar: UzunMuhalefet/Legal-IPTV listelerini indirir,
dizilere böler, tekrarları ayıklar, bölümleri numaraya göre sıralar ve
app/vod-data/<n>.json olarak yazar. TV böylece büyük listeleri indirip ayrıştırmaz.

Kullanım: python3 tools/build-vod.py
Kaynak sırası app/vod.js içindeki SOURCES ile aynı olmalı.
"""
import json
import os
import re
import urllib.request

BASE = 'https://raw.githubusercontent.com/UzunMuhalefet/Legal-IPTV/main/lists/video/sources/'
SOURCES = [
    ('Kanal D', False, ['www-kanald-com-tr/arsiv-diziler.m3u']),
    ('Star TV', False, ['www-startv-com-tr/arsiv.m3u']),
    ('Show TV', False, ['www-showtv-com-tr/arsiv-diziler.m3u']),
    ('TV8', False, ['www-tv8-com-tr/all.m3u']),
    ('Teve2', False, ['www-teve2-com-tr/diziler.m3u']),
    ('TRT 1', False, ['www-trt1-com-tr/arsiv.m3u']),
    ('Filmler', True, ['www-kanald-com-tr/evde-sinema.m3u', 'puhutv-com/filmler.m3u']),
    ('Çocuk', False, ['www-cartoonnetwork-com-tr/videolar.m3u']),
]
OUT = os.path.join(os.path.dirname(__file__), '..', 'app', 'vod-data')

# Sadece diziler kalsın: haber, yemek, sağlık, yarışma, magazin, belgesel ve gündüz programları çıkarılır
NOT_SERIES = {
    'Star TV': ['Sabahın Sultanı Seda Sayan', 'Zahide Yetiş ile Yeniden Başlasak', 'Star Haber',
                'Vahe ile Evdeki Mutluluk', 'Çok Güzel Hareketler 2', 'Dr. Özgür Koldaş ile Sağlık Gündemi',
                'En Güzel Bölüm'],
    'TV8': ['Survivor', "Zuhal Topal'la Yemekteyiz", 'Doya Doya Moda', 'Cevap Ver Türkiye', 'Çarkıfelek',
            '2.Sayfa', "8'de Sağlık", 'Gençlik Rüzgarı', 'Gazete Magazin', 'Bir Yemek Olsan', '10 Yaş Genç',
            "Demet ve Jess'le Gel Konuşalım", 'Aramızda Kalmasın', 'Survivor Panorama', "8'de Bugün",
            'Apartmanlar Yarışıyor', 'Çook Yaşa', 'En Şık Benim', 'Eser Yenenler Show', 'Gel Konuşalım',
            'Gerçeğin Peşinde', 'Göz6', 'Hayalimdeki Değişim', 'Lezzet Düşkünleri', 'Mutfakta Türev Var',
            'Paylaş Benimle'],
    'TRT 1': ['Bekir Develi ile Annemin Yemeği', 'Büyük Sürgün Kafkasya', 'Dinle Kazan', 'Heredot Cevdet Saati',
              'İyilik Kulübü', 'Kıssalı Harikalar Kumpanyası', 'Komşum Benim', 'Mukabele', 'Pastane',
              'Sanayi Savaşları', 'Seddülbahir 32 Saat', 'Şimdi Onlar Düşünsün', 'Zeyrek ile Çeyrek', '1 Gün Kala'],
}
EP_NO = re.compile(r'(\d+)\s*\.?\s*b[öo]l[üu]m', re.I)


def parse(text):
    lines = text.splitlines()
    out = []
    for i, line in enumerate(lines):
        if not line.startswith('#EXTINF') or i + 1 >= len(lines):
            continue
        url = lines[i + 1].strip()
        if not url.startswith('http'):
            continue
        q = line.rfind('",')
        title = (line[q + 2:] if q >= 0 else line.split(',', 1)[1]).strip()
        group = (re.search(r'group-title="([^"]*)"', line) or [None, ''])[1].strip()
        logo = (re.search(r'tvg-logo="([^"]*)"', line) or [None, ''])[1]
        out.append({'title': title, 'group': group, 'logo': logo, 'url': url})
    return out


def tidy(eps):
    seen = set()
    eps = [e for e in eps if not (e['url'] in seen or seen.add(e['url']))]
    nums = [EP_NO.search(e['title']) for e in eps]
    if sum(1 for n in nums if n) < len(eps) * 0.8:
        return eps
    order = sorted(range(len(eps)), key=lambda i: (int(nums[i].group(1)) if nums[i] else 10**9, i))
    return [eps[i] for i in order]


def main():
    os.makedirs(OUT, exist_ok=True)
    for n, (name, films, files) in enumerate(SOURCES):
        items = []
        for f in files:
            with urllib.request.urlopen(BASE + f, timeout=60) as r:
                items += parse(r.read().decode('utf-8', 'ignore'))
        shows, by_name = [], {}
        for it in items:
            key = it['title'] if films else (it['group'] or it['title'])
            if key not in by_name:
                by_name[key] = {'name': key, 'logo': it['logo'], 'eps': []}
                shows.append(by_name[key])
            by_name[key]['eps'].append(it)
        skip = set(NOT_SERIES.get(name, []))
        shows = [s for s in shows if s['name'] not in skip]
        # Bölüm: [başlık, adres]; ekranda sadece dizinin afişi kullanılıyor
        data = [{'name': s['name'], 'logo': s['logo'],
                 'eps': [[e['title'], e['url']] for e in tidy(s['eps'])]}
                for s in shows]
        path = os.path.join(OUT, f'{n}.json')
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
        print(f'{name:8} {len(data):4} dizi {sum(len(s["eps"]) for s in data):6} bölüm  {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main()
