(function () {
  'use strict';

  var C = window.CONFIG;
  var isTV = typeof window.tizen !== 'undefined';
  var $ = function (id) { return document.getElementById(id); };

  // Kumanda gezinme durumu (aşağıdaki fonksiyonlar erken çağrılabildiği için en üstte)
  var grid = [];
  var pos = { row: 0, col: 0 };
  var lastCol = {};

  /* ---------- Sahne ölçeği (TV'de 1, önizlemede pencereye sığar) ---------- */
  function fitStage() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $('stage').style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  /* ---------- Saat, tarih ve gökyüzü ---------- */
  var SKIES = [
    { from: 5,  to: 8,  top: '#0E1530', mid: '#33284A', glow: '#9A5560' }, // şafak
    { from: 8,  to: 17, top: '#081A36', mid: '#16385F', glow: '#3F74A8' }, // gündüz
    { from: 17, to: 20, top: '#100D26', mid: '#311B3E', glow: '#A84B45' }, // gün batımı
    { from: 20, to: 29, top: '#050913', mid: '#0B1630', glow: '#1C2F5E' }  // gece
  ];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function tick() {
    var d = new Date();
    $('clock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    $('date').textContent = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

    var h = d.getHours() < 5 ? d.getHours() + 24 : d.getHours();
    for (var i = 0; i < SKIES.length; i++) {
      if (h >= SKIES[i].from && h < SKIES[i].to) {
        var root = document.documentElement.style;
        root.setProperty('--sky-top', SKIES[i].top);
        root.setProperty('--sky-mid', SKIES[i].mid);
        root.setProperty('--sky-glow', SKIES[i].glow);
        break;
      }
    }
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
    clear:  { label: 'Açık',          codes: [0] },
    partly: { label: 'Parçalı bulutlu', codes: [1, 2] },
    cloudy: { label: 'Bulutlu',       codes: [3] },
    fog:    { label: 'Sisli',         codes: [45, 48] },
    rain:   { label: 'Yağmurlu',      codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82] },
    snow:   { label: 'Karlı',         codes: [71, 73, 75, 77, 85, 86] },
    storm:  { label: 'Fırtınalı',     codes: [95, 96, 99] }
  };

  var S = 'fill="none" stroke="#F2F4F8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  var CLOUD = '<path ' + S + ' d="M22 50h26a10 10 0 0 0 0-20 14 14 0 0 0-27-3A11 11 0 0 0 22 50z"/>';
  var ICONS = {
    clear: function (night) {
      return night
        ? '<path ' + S + ' d="M44 14a20 20 0 1 0 14 30A16 16 0 0 1 44 14z"/>'
        : '<circle ' + S + ' cx="32" cy="32" r="11"/><path ' + S + ' d="M32 9v6M32 49v6M9 32h6M49 32h6M15.7 15.7l4.2 4.2M44.1 44.1l4.2 4.2M15.7 48.3l4.2-4.2M44.1 19.9l4.2-4.2"/>';
    },
    partly: function (night) {
      var orb = night
        ? '<path ' + S + ' d="M40 8a12 12 0 1 0 12 17A10 10 0 0 1 40 8z"/>'
        : '<circle ' + S + ' cx="40" cy="20" r="8"/><path ' + S + ' d="M40 5v3M53 20h3M50.6 9.4l-2 2"/>';
      return orb + CLOUD;
    },
    cloudy: function () { return CLOUD; },
    fog: function () { return '<path ' + S + ' d="M12 26h40M8 34h48M14 42h36"/>'; },
    rain: function () { return CLOUD + '<path ' + S + ' d="M24 56l-2 5M33 56l-2 5M42 56l-2 5"/>'; },
    snow: function () { return CLOUD + '<path ' + S + ' d="M24 58h.01M33 60h.01M42 58h.01"/>'; },
    storm: function () { return CLOUD + '<path ' + S + ' d="M34 52l-5 7h7l-5 7"/>'; }
  };

  function weatherKind(code) {
    for (var k in WEATHER) if (WEATHER[k].codes.indexOf(code) >= 0) return k;
    return 'cloudy';
  }

  function getLocation() {
    if (C.location) return Promise.resolve(C.location);
    return fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (j) { return { name: j.city, lat: j.latitude, lon: j.longitude }; });
  }

  function loadWeather() {
    getLocation().then(function (loc) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
        '&current=temperature_2m,weather_code,is_day&timezone=auto';
      return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        var kind = weatherKind(j.current.weather_code);
        $('weather-icon').innerHTML = '<svg viewBox="0 0 64 64">' + ICONS[kind](j.current.is_day === 0) + '</svg>';
        $('weather-temp').textContent = Math.round(j.current.temperature_2m) + '°';
        $('weather-desc').textContent = WEATHER[kind].label + (loc.name ? ', ' + loc.name : '');
        $('weather').hidden = false;
      });
    }).catch(function () { /* hava durumu alınamazsa alan gizli kalır */ });
  }
  loadWeather();
  setInterval(loadWeather, 20 * 60 * 1000);

  /* ---------- YouTube kanallarından yeni videolar ---------- */
  var videos = [];

  // Önizleme için örnek videolar (tarayıcıda ?demo ile açılırsa)
  var DEMO = [
    { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE (강남스타일) M/V', channel: 'officialpsy' },
    { id: 'jNQXAC9IVRw', title: 'Me at the zoo', channel: 'jawed' },
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up (Official Video)', channel: 'Rick Astley' }
  ];

  function loadVideos() {
    if (!isTV && /demo/.test(location.search)) { videos = DEMO; return renderVideos(); }
    if (!C.youtubeChannels.length) return;
    Promise.all(C.youtubeChannels.map(function (id) {
      return fetch(C.serviceUrl + '/rss?channel=' + encodeURIComponent(id) + (C.youtubeApiKey ? '&key=' + encodeURIComponent(C.youtubeApiKey) : ''))
        .then(function (r) { return r.json(); })
        .catch(function () { return []; });
    })).then(function (lists) {
      var all = [].concat.apply([], lists);
      all.sort(function (a, b) { return b.published.localeCompare(a.published); });
      videos = all.slice(0, C.videoCount);
      renderVideos();
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderVideos() {
    var box = $('videos');
    box.innerHTML = videos.map(function (v) {
      return '<button class="video" data-video="' + escapeHtml(v.id) + '">' +
        '<span class="video-thumb"><img src="https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/hqdefault.jpg" alt=""></span>' +
        '<span class="video-title">' + escapeHtml(v.title) + '</span>' +
        '<span class="video-channel">' + escapeHtml(v.channel) + '</span>' +
        '</button>';
    }).join('');
    $('videos-row').hidden = videos.length === 0;
    buildGrid();
  }
  loadVideos();
  setInterval(loadVideos, 30 * 60 * 1000);

  /* ---------- Uygulama başlatma ---------- */
  function launchById(ids, done, fail) {
    if (!ids.length) return fail();
    tizen.application.launch(ids[0], done, function () { launchById(ids.slice(1), done, fail); });
  }

  function launchApp(key) {
    var app = C.apps[key];
    if (!isTV) return toast(app.name + ' açılıyor (önizleme)');
    launchById(app.ids, function () {}, function () {
      // Kimlik tutmadıysa yüklü uygulamalar arasında isimle ara
      tizen.application.getAppsInfo(function (list) {
        var hit = list.filter(function (a) { return a.name && a.name.toLowerCase().indexOf(app.name.toLowerCase()) >= 0; })[0];
        if (hit) tizen.application.launch(hit.id);
        else toast(app.name + ' bu TV\'de bulunamadı');
      });
    });
  }

  function openVideo(id) {
    if (!isTV) return toast('Video YouTube\'da açılıyor (önizleme)');
    try {
      var data = [new tizen.ApplicationControlData('PAYLOAD', ['{"values":"v=' + id + '"}'])];
      var ctrl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', null, null, null, data);
      tizen.application.launchAppControl(ctrl, C.apps.youtube.ids[0], null, function () { launchApp('youtube'); });
    } catch (e) {
      launchApp('youtube');
    }
  }

  function switchToPlaystation() {
    var token = '';
    try { token = localStorage.getItem('tvToken') || ''; } catch (e) {}
    toast('HDMI ' + C.playstationHdmi + ' açılıyor');
    fetch(C.serviceUrl + '/key?k=KEY_HDMI' + C.playstationHdmi + '&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.token) try { localStorage.setItem('tvToken', j.token); } catch (e) {}
        if (!j.ok) toast(j.error === 'timeout'
          ? 'TV ekranındaki izin sorusunda İzin ver\'i seç, sonra tekrar dene'
          : 'HDMI girişine geçilemedi');
      })
      .catch(function () { toast('HDMI girişine geçilemedi'); });
  }

  var ACTIONS = {
    netflix: function () { launchApp('netflix'); },
    youtube: function () { launchApp('youtube'); },
    playstation: switchToPlaystation
  };

  /* ---------- Kumanda ile gezinme ---------- */
  function buildGrid() {
    var current = grid[pos.row] && grid[pos.row][pos.col];
    grid = [];
    if (!$('videos-row').hidden) grid.push([].slice.call(document.querySelectorAll('.video')));
    grid.push([].slice.call(document.querySelectorAll('.apps-main .app')));
    grid.push([].slice.call(document.querySelectorAll('.apps-more .app')));
    // Başlangıçta odak ana uygulama satırında (Netflix) olsun
    pos = { row: grid.length - 2, col: 0 };
    for (var r = 0; r < grid.length; r++) {
      var c = grid[r].indexOf(current);
      if (c >= 0) pos = { row: r, col: c };
    }
    paintFocus();
  }

  function paintFocus() {
    [].forEach.call(document.querySelectorAll('.focused'), function (el) { el.classList.remove('focused'); });
    var el = grid[pos.row] && grid[pos.row][pos.col];
    if (el) el.classList.add('focused');
  }

  function move(dRow, dCol) {
    if (dCol) {
      pos.col = Math.max(0, Math.min(grid[pos.row].length - 1, pos.col + dCol));
    } else {
      var next = pos.row + dRow;
      if (next < 0 || next >= grid.length) return;
      lastCol[pos.row] = pos.col;
      pos.row = next;
      pos.col = Math.min(lastCol[next] || 0, grid[next].length - 1);
    }
    paintFocus();
  }

  function activate() {
    var el = grid[pos.row][pos.col];
    if (el.dataset.action) ACTIONS[el.dataset.action]();
    else if (el.dataset.app) launchApp(el.dataset.app);
    else if (el.dataset.video) openVideo(el.dataset.video);
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
    var el = e.target.closest('.app, .video');
    if (!el) return;
    for (var r = 0; r < grid.length; r++) {
      var c = grid[r].indexOf(el);
      if (c >= 0) { pos = { row: r, col: c }; paintFocus(); activate(); }
    }
  });

  buildGrid();
})();
