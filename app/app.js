(function () {
  'use strict';

  var C = window.CONFIG;
  // TizenBrew modülü 127.0.0.1:8081 üzerinden sunar; önizleme başka bir porttan açılır
  var isTV = location.port === '8081' || typeof window.tizen !== 'undefined';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Sahne ölçeği (TV'de 1, önizlemede pencereye sığar) ---------- */
  function fitStage() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $('stage').style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  /* ---------- Selam, saat ve tarih ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function greeting(h) {
    if (h >= 5 && h < 12) return 'Günaydın';
    if (h >= 12 && h < 18) return 'İyi günler';
    if (h >= 18 && h < 23) return 'İyi akşamlar';
    return 'İyi geceler';
  }

  function tick() {
    var d = new Date();
    $('greeting').textContent = greeting(d.getHours()) + (C.userName ? ', ' + C.userName : '');
    $('clock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    $('date').textContent = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  /* ---------- Hava durumu (Open-Meteo, anahtar gerektirmez) ---------- */
  var WEATHER = {
    clear:  [0],
    partly: [1, 2],
    cloudy: [3],
    fog:    [45, 48],
    rain:   [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
    snow:   [71, 73, 75, 77, 85, 86],
    storm:  [95, 96, 99]
  };

  var CLOUD = '<path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5-1A4.5 4.5 0 0 0 7 18z"/>';
  var ICONS = {
    clear: function (night) {
      return night
        ? '<path d="M16 3a8 8 0 1 0 5 13A6.5 6.5 0 0 1 16 3z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>';
    },
    partly: function () { return CLOUD; },
    cloudy: function () { return CLOUD; },
    fog: function () { return '<path d="M4 9h16M3 13h18M5 17h14"/>'; },
    rain: function () { return CLOUD + '<path d="M8.5 20l-1 2.5M12.5 20l-1 2.5M16.5 20l-1 2.5"/>'; },
    snow: function () { return CLOUD + '<path d="M9 21h.01M13 21h.01"/>'; },
    storm: function () { return CLOUD + '<path d="M12 18l-2 3h3l-2 3"/>'; }
  };

  var LABELS = {
    clear: 'açık', partly: 'parçalı bulutlu', cloudy: 'bulutlu', fog: 'sisli',
    rain: 'yağmurlu', snow: 'karlı', storm: 'fırtınalı'
  };

  function weatherKind(code) {
    for (var k in WEATHER) if (WEATHER[k].indexOf(code) >= 0) return k;
    return 'cloudy';
  }

  function renderForecast(daily) {
    $('forecast').innerHTML = daily.time.map(function (day, i) {
      // "2026-11-15" → yerel tarih (UTC kaymasın diye öğlen saatiyle)
      var d = new Date(day + 'T12:00:00');
      var name = i === 0 ? 'Bugün' : d.toLocaleDateString('tr-TR', { weekday: 'short' });
      var kind = weatherKind(daily.weather_code[i]);
      return '<div class="day' + (i === 0 ? ' day-today' : '') + '">' +
        '<div class="day-name">' + name + '</div>' +
        '<svg viewBox="0 0 24 24">' + ICONS[kind](false) + '</svg>' +
        '<div class="day-temp">' + Math.round(daily.temperature_2m_max[i]) + '°' +
        '<span>' + Math.round(daily.temperature_2m_min[i]) + '°</span></div>' +
        '</div>';
    }).join('');
    $('today-summary').textContent = 'Bugün hava ' + LABELS[weatherKind(daily.weather_code[0])] +
      ', en yüksek ' + Math.round(daily.temperature_2m_max[0]) + '°, en düşük ' +
      Math.round(daily.temperature_2m_min[0]) + '°.';
    $('weekly').hidden = false;
  }

  function loadWeather() {
    var loc = C.location;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
      '&current=temperature_2m,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto';
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var kind = weatherKind(j.current.weather_code);
      $('weather-icon').innerHTML = '<svg viewBox="0 0 24 24">' + ICONS[kind](j.current.is_day === 0) + '</svg>';
      $('weather-text').textContent = Math.round(j.current.temperature_2m) + '° ' + loc.name;
      $('weather').hidden = false;
      renderForecast(j.daily);
    }).catch(function () { /* alınamazsa hap gizli kalır */ });
  }
  loadWeather();
  setInterval(loadWeather, 20 * 60 * 1000);

  /* ---------- Uygulama başlatma ---------- */
  function launchById(ids, done, fail) {
    if (!ids.length) return fail();
    tizen.application.launch(ids[0], done, function () { launchById(ids.slice(1), done, fail); });
  }

  // Uygulamayı TV'deki servis açar (sayfanın tizen arayüzüne erişimi yok)
  function launchApp(key) {
    var app = C.apps[key];
    if (!isTV) return toast(app.name + ' açılıyor (önizleme)');
    fetch(C.serviceUrl + '/launch?ids=' + encodeURIComponent(app.ids.join(',')) + '&name=' + encodeURIComponent(app.name))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) return;
        toast(j.error === 'not-found'
          ? app.name + ' bu TV\'de bulunamadı'
          : app.name + ' açılamadı (' + j.error + ')');
      })
      .catch(function () {
        // Servis yoksa sayfanın kendi tizen arayüzünü dene
        if (window.tizen) launchById(app.ids, function () {}, function () { toast(app.name + ' açılamadı'); });
        else toast(app.name + ' açılamadı: servis çalışmıyor');
      });
  }

  // TV'ye kumanda tuşu gönderir (HDMI geçişi, kaynak menüsü, ayarlar)
  function sendKey(key, label) {
    if (!isTV) return toast(label + ' (önizleme)');
    var token = '';
    try { token = localStorage.getItem('tvToken') || ''; } catch (e) {}
    fetch(C.serviceUrl + '/key?k=' + key + '&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.token) try { localStorage.setItem('tvToken', j.token); } catch (e) {}
        if (!j.ok) toast(j.error === 'timeout'
          ? 'TV ekranındaki izin sorusunda İzin ver\'i seç, sonra tekrar dene'
          : label + ' açılamadı (' + j.error + ')');
      })
      .catch(function () { toast(label + ' açılamadı: servis çalışmıyor'); });
  }

  /* ---------- HDMI cihazları ---------- */
  var DEVICE_ICONS = {
    playstation: '<path d="M7 9h10c3 0 4.6 2.6 5.2 5.6l.8 3.8c.3 1.6-1.6 2.6-2.8 1.5L17.5 17h-11L3.8 19.9c-1.2 1.1-3.1.1-2.8-1.5l.8-3.8C2.4 11.6 4 9 7 9z"/><path d="M7 12v3.4M5.3 13.7h3.4"/>',
    hdmi: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>'
  };

  function renderDevices() {
    $('devices').innerHTML = C.devices.map(function (dev, i) {
      return '<button class="device" data-device="' + i + '">' +
        '<svg viewBox="0 0 24 24">' + (DEVICE_ICONS[dev.icon] || DEVICE_ICONS.hdmi) + '</svg>' +
        '<span class="device-name">' + dev.name + '</span>' +
        '<span class="device-port">HDMI ' + dev.hdmi + '</span>' +
        '</button>';
    }).join('');
  }
  renderDevices();

  /* ---------- Fotoğraf arka planı ---------- */
  var photoLayers = [$('photo-a'), $('photo-b')];
  var activeLayer = 0;
  var currentPhoto = -1;

  function showPhoto() {
    var list = C.photos;
    if (!list.length) return;
    // Aynı zaman diliminde hep aynı fotoğraf; yenileyince değişmez
    var i = Math.floor(Date.now() / (C.photoMinutes * 60000)) % list.length;
    if (i === currentPhoto) return;
    var p = typeof list[i] === 'string' ? { src: list[i] } : list[i];
    var img = new Image();
    img.onload = function () {
      currentPhoto = i;
      var next = photoLayers[1 - activeLayer];
      next.style.backgroundImage = 'url("' + p.src + '")';
      next.classList.add('on');
      photoLayers[activeLayer].classList.remove('on');
      activeLayer = 1 - activeLayer;
      $('photo-credit').textContent = p.credit || '';
      document.body.classList.add('has-photo');
    };
    img.src = p.src;
  }
  showPhoto();
  setInterval(showPhoto, 60 * 1000);

  if (!C.blur) document.body.classList.add('no-blur');

  /* ---------- Kumanda ile gezinme ---------- */
  var pills = [].slice.call(document.querySelectorAll('.pill:not(.pill-static)'));
  var apps = [].slice.call(document.querySelectorAll('.app'));
  var devices = [].slice.call(document.querySelectorAll('.device'));
  var grid = devices.length ? [pills, apps, devices] : [pills, apps];
  var pos = { row: 1, col: 0 };
  var lastCol = [pills.length - 1, 0, 0];
  var CARD_STEP = 316 + 22;
  var VISIBLE = 4;

  function paintFocus() {
    [].forEach.call(document.querySelectorAll('.focused'), function (el) { el.classList.remove('focused'); });
    var el = grid[pos.row][pos.col];
    el.classList.add('focused');

    if (pos.row === 2) {
      var dev = C.devices[el.dataset.device];
      $('focus-title').textContent = dev.name;
      document.documentElement.style.setProperty('--glow', dev.glow || '#3A4A6A');
    } else if (pos.row === 1) {
      $('focus-title').textContent = C.apps[el.dataset.app].name;
      document.documentElement.style.setProperty('--glow', el.dataset.glow);
      // Odaktaki kart görünür kalsın diye tepsiyi kaydır
      var shift = Math.max(0, pos.col - VISIBLE) * CARD_STEP;
      $('track').style.transform = 'translateX(' + -shift + 'px)';
    }
  }

  function move(dRow, dCol) {
    if (dCol) {
      pos.col = Math.max(0, Math.min(grid[pos.row].length - 1, pos.col + dCol));
    } else {
      var next = pos.row + dRow;
      if (next < 0 || next >= grid.length) return;
      lastCol[pos.row] = pos.col;
      pos.row = next;
      pos.col = Math.min(lastCol[next], grid[next].length - 1);
    }
    paintFocus();
  }

  function activate() {
    var el = grid[pos.row][pos.col];
    if (el.dataset.key) sendKey(el.dataset.key, el.textContent.trim());
    else if (el.dataset.app) launchApp(el.dataset.app);
    else if (el.dataset.device) {
      var dev = C.devices[el.dataset.device];
      sendKey('KEY_HDMI' + dev.hdmi, dev.name);
    }
  }

  document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case 37: move(0, -1); break;
      case 39: move(0, 1); break;
      case 38: move(-1, 0); break;
      case 40: move(1, 0); break;
      case 13: activate(); break;
      default: return;
    }
    e.preventDefault();
  });

  // Önizlemede fareyle de kullanılabilsin
  document.addEventListener('click', function (e) {
    var el = e.target.closest('.app, .pill, .device');
    if (!el) return;
    for (var r = 0; r < grid.length; r++) {
      var c = grid[r].indexOf(el);
      if (c >= 0) { pos = { row: r, col: c }; paintFocus(); activate(); }
    }
  });

  paintFocus();
})();
