// Canlı TV kanalları: yalnızca yayıncıların kendi sunucularındaki ücretsiz yayınlar.
// Kaynak: iptv-org (https://github.com/iptv-org/iptv), Almanya'dan test edildi (Kasım 2026).
// Yayıncılar adresleri değiştirebilir; açılmayan kanal olursa buradan güncellenir.
window.CHANNELS = [
  { name: "TRT 1", group: "Ulusal", url: "https://tv-trt1.medya.trt.com.tr/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/TRT_1_logo_%282021-%29.svg/960px-TRT_1_logo_%282021-%29.svg.png" },
  { name: "ATV", group: "Ulusal", url: "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/atv/atv_1080p.m3u8", logo: "https://i.imgur.com/HyVUwFC.png" },
  { name: "Kanal D", group: "Ulusal", url: "https://demiroren.daioncdn.net/kanald/kanald.m3u8?app=kanald_web&ce=3", logo: "https://i.imgur.com/9o1atM6.png" },
  { name: "Star TV", group: "Ulusal", url: "https://dogus.daioncdn.net/startv/startv_720p.m3u8?app=a20ac41e-bdc3-4aa1-934d-26b484480ac9&ce=3&sid=8l4w3lst4co5", logo: "https://i.imgur.com/9O3DHRB.png" },
  { name: "NOW", group: "Ulusal", url: "https://uycyyuuzyh.turknet.ercdn.net/nphindgytw/nowtv/nowtv_720p.m3u8", logo: "https://i.imgur.com/5EYjWK7.png" },
  { name: "360", group: "Ulusal", url: "https://turkmedya-live.ercdn.net/tv360/tv360.m3u8", logo: "https://i.imgur.com/agn47sQ.png" },
  { name: "Euro D", group: "Ulusal", url: "https://live.duhnet.tv/S2/HLS_LIVE/eurodnp/playlist.m3u8", logo: "https://i.imgur.com/x9kHsXo.png" },
  { name: "TRT Haber", group: "Haber", url: "https://tv-trthaber.medya.trt.com.tr/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/TRT_Haber_Eyl%C3%BCl_2020_Logo.svg/960px-TRT_Haber_Eyl%C3%BCl_2020_Logo.svg.png" },
  { name: "NTV", group: "Haber", url: "https://dogus.daioncdn.net/ntv/ntv.m3u8?app=ntv_web", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/NTV_%28Turkey%29_logo.svg/960px-NTV_%28Turkey%29_logo.svg.png" },
  { name: "A Haber", group: "Haber", url: "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/ahaber/ahaber.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Ahaber_Logo.png" },
  { name: "Halk TV", group: "Haber", url: "https://halktv-live.daioncdn.net/halktv/halktv.m3u8", logo: "https://i.imgur.com/xM0HA30.png" },
  { name: "24 TV", group: "Haber", url: "https://turkmedya-live.ercdn.net/tv24/tv24.m3u8", logo: "https://i.imgur.com/8FO41es.png" },
  { name: "TGRT Haber", group: "Haber", url: "https://canli.tgrthaber.com/tgrt.m3u8", logo: "https://i.imgur.com/PrxwKDw.png" },
  { name: "Tele 1", group: "Haber", url: "https://tele1-live.ercdn.net/tele1/tele1.m3u8", logo: "https://upload.wikimedia.org/wikipedia/tr/4/43/Tele1_logosu.png" },
  { name: "A Spor", group: "Spor", url: "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor.m3u8", logo: "https://i.imgur.com/ZhkZzLf.png" },
  { name: "HT Spor", group: "Spor", url: "https://ciner.daioncdn.net/ht-spor/ht-spor.m3u8?app=web", logo: "https://www.htspor.com/images/manifest/social-share-logo.png" },
  { name: "TRT Müzik", group: "Müzik", url: "https://tv-trtmuzik.medya.trt.com.tr/master.m3u8", logo: "https://i.imgur.com/JgUzRH8.png" },
  { name: "PowerTürk", group: "Müzik", url: "https://live.artidijitalmedya.com/artidijital_powerturktv/powerturktv/playlist.m3u8", logo: "https://i.imgur.com/9OPoXQG.png" },
  { name: "Number 1", group: "Müzik", url: "https://b01c02nl.mediatriple.net/videoonlylive/mtkgeuihrlfwlive/broadcast_5c9e17cd59e8b.smil/playlist.m3u8", logo: "https://i.imgur.com/02cDIBi.png" },
  { name: "Dream Türk", group: "Müzik", url: "https://live.duhnet.tv/S2/HLS_LIVE/dreamturknp/playlist.m3u8", logo: "https://i.imgur.com/vJ8VaZi.png" },
  { name: "TRT Türk", group: "Diğer", url: "https://tv-trtturk.medya.trt.com.tr/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/TRT_T%C3%BCrk_logo.svg/960px-TRT_T%C3%BCrk_logo.svg.png" },
  { name: "TRT Avaz", group: "Diğer", url: "https://tv-trtavaz.medya.trt.com.tr/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/TRT_Avaz_logo.svg/960px-TRT_Avaz_logo.svg.png" },
  { name: "Minika Çocuk", group: "Diğer", url: "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/minikago_cocuk/minikago_cocuk.m3u8", logo: "https://i.imgur.com/VCywMTv.png" },
  { name: "Diyanet TV", group: "Diğer", url: "https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3bf95a47e07.smil/playlist.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Diyanet_TV_logo.svg/960px-Diyanet_TV_logo.svg.png" }
];
