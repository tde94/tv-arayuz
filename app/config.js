// Arayüz ayarları — değiştirmek istediğin her şey burada.
window.CONFIG = {
  // Hava durumu konumu
  location: { name: 'Lehrte', lat: 52.3725, lon: 9.9769 },

  // PlayStation'ın bağlı olduğu HDMI girişi (1–4).
  playstationHdmi: 1,

  // TV'deki uygulama kimlikleri. Bulunamazsa isimden aranır.
  apps: {
    netflix: { ids: ['3201907018807', '11101200001'], name: 'Netflix' },
    youtube: { ids: ['111299001912'], name: 'YouTube' },
    playstation: { ids: [], name: 'PlayStation' },
    prime: { ids: ['3201512006785'], name: 'Prime Video' },
    disney: { ids: ['3201901017640'], name: 'Disney+' },
    spotify: { ids: ['3201606009684'], name: 'Spotify' },
    browser: { ids: ['org.tizen.browser'], name: 'Internet' },
    smartthings: { ids: [], name: 'SmartThings' }
  },

  // TV'de çalışan modül servisinin adresi.
  serviceUrl: 'http://127.0.0.1:8091'
};
