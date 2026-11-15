// Arayüz ayarları — değiştirmek istediğin her şey burada.
window.CONFIG = {
  // Selamlamada gösterilecek isim (boş bırakılırsa sadece selam yazar)
  userName: 'Taylan Deniz',

  // Hava durumu konumu
  location: { name: 'Lehrte', lat: 52.3725, lon: 9.9769 },

  // HDMI'ya bağlı cihazlar. Seçilince TV o girişe geçer.
  devices: [
    { name: 'PlayStation 5', hdmi: 1, icon: 'playstation', glow: '#0A5BC4' }
  ],

  // Arka plan fotoğrafları: dosya yolu (photos/...) ya da internet adresi.
  // credit: sol altta küçük yazıyla gösterilir (boş olabilir).
  photos: [],
  photoMinutes: 30,

  // Paneller buzlu cam gibi bulanık olsun mu? TV kasarsa false yap.
  blur: true,

  // TV'deki uygulama kimlikleri. Bulunamazsa isimden aranır.
  apps: {
    netflix: { ids: ['3201907018807', '11101200001'], name: 'Netflix' },
    youtube: { ids: ['111299001912'], name: 'YouTube' },
    prime: { ids: ['3201512006785'], name: 'Prime Video' },
    disney: { ids: ['3201901017640'], name: 'Disney+' },
    spotify: { ids: ['3201606009684'], name: 'Spotify' },
    browser: { ids: ['org.tizen.browser'], name: 'Internet' },
    smartthings: { ids: [], name: 'SmartThings' }
  },

  // TV'de çalışan modül servisinin adresi.
  serviceUrl: 'http://127.0.0.1:8091'
};
