// Diziler & Filmler: kanalların sitelerinde ücretsiz yayınlanan arşiv bölümleri.
// Listeler UzunMuhalefet/Legal-IPTV reposundan (kanalların kendi sunucularına bağlantılar).
// Ekran seviyeleri: sekmeler (kanallar) → afiş ızgarası (diziler) → bölüm listesi → oynatıcı.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var BASE = 'https://raw.githubusercontent.com/UzunMuhalefet/Legal-IPTV/main/lists/video/sources/';
  var SOURCES = [
    { name: 'Kanal D', files: ['www-kanald-com-tr/arsiv-diziler.m3u'] },
    { name: 'Star TV', files: ['www-startv-com-tr/arsiv.m3u'] },
    { name: 'Show TV', files: ['www-showtv-com-tr/arsiv-diziler.m3u'] },
    { name: 'TV8', files: ['www-tv8-com-tr/all.m3u'] },
    { name: 'Teve2', files: ['www-teve2-com-tr/diziler.m3u'] },
    { name: 'TRT 1', files: ['www-trt1-com-tr/arsiv.m3u'] },
    { name: 'Filmler', films: true, files: ['www-kanald-com-tr/evde-sinema.m3u', 'puhutv-com/filmler.m3u'] },
    { name: 'Çocuk', files: ['www-cartoonnetwork-com-tr/videolar.m3u'] }
  ];
  var COLS = 5;
  var KEY = { back: 10009, esc: 27, chUp: 427, chDown: 428, play: 415, pause: 19, playPause: 10252, ff: 417, rw: 412, stop: 413 };

  var state = { open: false, level: 'tabs', src: 0, show: 0, ep: 0, shows: null, playing: null };
  var cache = {};

  if (window.tizen && tizen.tvinputdevice) {
    ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind', 'MediaStop'].forEach(function (k) {
      try { tizen.tvinputdevice.registerKey(k); } catch (e) {}
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Veri ---------- */
  function parseM3u(text) {
    var lines = text.split('\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (l.indexOf('#EXTINF') !== 0) continue;
      var url = (lines[i + 1] || '').trim();
      if (!/^https?:/.test(url)) continue;
      var q = l.lastIndexOf('",');
      out.push({
        title: (q >= 0 ? l.slice(q + 2) : l.slice(l.indexOf(',') + 1)).trim(),
        group: ((l.match(/group-title="([^"]*)"/) || [])[1] || '').trim(),
        logo: (l.match(/tvg-logo="([^"]*)"/) || [])[1] || '',
        url: url
      });
    }
    return out;
  }

  // Bölümleri dizilere böl; film kaynaklarında her film tek bölümlük bir "dizi"
  function groupShows(src, items) {
    var shows = [];
    var byName = {};
    items.forEach(function (it) {
      var key = src.films ? it.title : it.group || it.title;
      if (!byName[key]) {
        byName[key] = { name: key, logo: it.logo, eps: [] };
        shows.push(byName[key]);
      }
      byName[key].eps.push(it);
    });
    return shows;
  }

  function load(i, cb) {
    if (cache[i]) return cb(cache[i]);
    var src = SOURCES[i];
    Promise.all(src.files.map(function (f) {
      return fetch(BASE + f).then(function (r) { return r.text(); }).then(parseM3u).catch(function () { return []; });
    })).then(function (lists) {
      cache[i] = groupShows(src, [].concat.apply([], lists));
      cb(cache[i]);
    });
  }

  /* ---------- İlerleme (kaldığın yer) ---------- */
  function getProgress() {
    try { return JSON.parse(localStorage.getItem('vodProgress') || '{}'); } catch (e) { return {}; }
  }
  function saveProgress(p, t, d) {
    var all = getProgress();
    all[p.url] = { t: t, d: d, src: p.src, show: p.show, title: p.title, logo: p.logo, url: p.url, ts: Date.now() };
    // En yeni 40 kayıt kalsın
    var keys = Object.keys(all).sort(function (a, b) { return all[b].ts - all[a].ts; });
    keys.slice(40).forEach(function (k) { delete all[k]; });
    try { localStorage.setItem('vodProgress', JSON.stringify(all)); } catch (e) {}
  }
  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }

  // Yarım kalanlar (ana ekrandaki "Devam et" satırı için)
  function recent() {
    var all = getProgress();
    return Object.keys(all).map(function (k) { return all[k]; })
      .filter(function (p) { return p.d && p.t > 30 && p.t < p.d - 60; })
      .sort(function (a, b) { return b.ts - a.ts; })
      .slice(0, 8);
  }

  /* ---------- Gezinme ekranı ---------- */
  function renderTabs() {
    $('vod-tabs').innerHTML = SOURCES.map(function (s, i) {
      var cls = 'vod-tab' + (i === state.src ? ' active' : '') + (state.level === 'tabs' && i === state.src ? ' focused' : '');
      return '<div class="' + cls + '">' + s.name + '</div>';
    }).join('');
  }

  function renderGrid() {
    var shows = state.shows;
    if (!shows) { $('vod-body').innerHTML = '<div class="vod-empty">Yükleniyor…</div>'; return; }
    if (!shows.length) { $('vod-body').innerHTML = '<div class="vod-empty">Bu arşiv şu an açılamıyor.</div>'; return; }
    $('vod-body').innerHTML = '<div class="vod-grid" id="vod-grid">' + shows.map(function (s, i) {
      return '<div class="vod-card' + (state.level === 'grid' && i === state.show ? ' focused' : '') + '">' +
        '<div class="vod-poster">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="">' : '') + '</div>' +
        '<div class="vod-card-title">' + esc(s.name) + '</div>' +
        '<div class="vod-card-meta">' + (SOURCES[state.src].films ? 'Film' : s.eps.length + ' bölüm') + '</div></div>';
    }).join('') + '</div>';
    scrollGrid();
  }

  function scrollGrid() {
    var grid = $('vod-grid');
    if (!grid) return;
    var row = state.level === 'grid' ? Math.floor(state.show / COLS) : 0;
    grid.style.transform = 'translateY(' + -Math.max(0, row - 1) * 300 + 'px)';
  }

  function paintGrid() {
    var cards = document.querySelectorAll('.vod-card');
    for (var i = 0; i < cards.length; i++) cards[i].classList.toggle('focused', state.level === 'grid' && i === state.show);
    scrollGrid();
  }

  function renderEps() {
    var s = state.shows[state.show];
    var prog = getProgress();
    $('vod-body').innerHTML =
      '<div class="vod-eps-wrap">' +
        '<div class="vod-side">' +
          '<div class="vod-poster vod-poster-big">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="">' : '') + '</div>' +
          '<div class="vod-side-title">' + esc(s.name) + '</div>' +
          '<div class="vod-card-meta">' + SOURCES[state.src].name + ', ' + s.eps.length + ' bölüm</div>' +
        '</div>' +
        '<div class="vod-eps" id="vod-eps">' + s.eps.map(function (e, i) {
          var p = prog[e.url];
          var mark = p && p.d ? (p.t >= p.d - 60 ? '<span class="vod-done">İzlendi</span>' : '<span class="vod-resume">Kaldığın yer ' + fmt(p.t) + '</span>') : '';
          return '<div class="vod-ep' + (i === state.ep ? ' focused' : '') + '"><span>' + esc(e.title) + '</span>' + mark + '</div>';
        }).join('') + '</div>' +
      '</div>';
    scrollEps();
  }

  function scrollEps() {
    var list = $('vod-eps');
    if (!list) return;
    var items = list.children;
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('focused', i === state.ep);
    var el = items[state.ep];
    if (el) list.scrollTop = Math.max(0, el.offsetTop - 300);
  }

  function selectSource(i) {
    state.src = (i + SOURCES.length) % SOURCES.length;
    state.show = 0;
    state.shows = cache[state.src] || null;
    renderTabs();
    renderGrid();
    var want = state.src;
    load(want, function (shows) {
      if (state.src !== want) return;
      state.shows = shows;
      if (state.level !== 'eps') renderGrid();
    });
  }

  function open() {
    state.open = true;
    state.level = 'tabs';
    $('vod').hidden = false;
    selectSource(state.src);
  }

  function close() {
    state.open = false;
    $('vod').hidden = true;
    if (window.APP) window.APP.refreshPreview();
  }

  /* ---------- Oynatıcı ---------- */
  var video = $('vod-video');
  var hls = null;
  var stallTimer = null;
  var osdTimer = null;
  var saveTimer = null;

  function status(s) { $('vod-status').textContent = s; }
  video.addEventListener('playing', function () { clearTimeout(stallTimer); status(''); });
  video.addEventListener('waiting', function () { status('Yükleniyor…'); });
  video.addEventListener('timeupdate', function () {
    if (!$('vod-osd').classList.contains('show')) return;
    paintOsd();
  });
  video.addEventListener('ended', function () { nextEpisode(1); });

  function stop() {
    clearTimeout(stallTimer);
    clearInterval(saveTimer);
    if (hls) { hls.destroy(); hls = null; }
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  // Bazı arşiv sunucuları (TRT) isteklerin bir kısmına hiç cevap vermiyor;
  // 8 sn'de veri gelmezse bağlantıyı kapatıp yeniden iste (en fazla 5 kez)
  function playNative(url, attempt) {
    attempt = attempt || 1;
    if (hls) { hls.destroy(); hls = null; }
    clearTimeout(stallTimer);
    video.src = url;
    video.play().catch(function () {});
    stallTimer = setTimeout(function () {
      if (video.readyState >= 1) {
        // Bağlantı kuruldu; görüntü gelmezse yine de haber ver
        stallTimer = setTimeout(function () { if (video.readyState < 3) status('Bu bölüm şu an açılamıyor'); }, 20000);
        return;
      }
      if (attempt >= 5) return status('Bu bölüm şu an açılamıyor');
      status('Yükleniyor… (' + (attempt + 1) + '. deneme)');
      video.removeAttribute('src');
      video.load();
      playNative(url, attempt + 1);
    }, 8000);
  }

  function playHls(url, next) {
    if (hls) { hls.destroy(); hls = null; }
    clearTimeout(stallTimer);
    var done = false;
    var fail = function () { if (!done) { done = true; next(); } };
    hls = new Hls({ maxBufferLength: 30 });
    hls.on(Hls.Events.MANIFEST_PARSED, function () { video.play().catch(function () {}); });
    hls.on(Hls.Events.ERROR, function (ev, data) { if (data.fatal) fail(); });
    hls.loadSource(url);
    hls.attachMedia(video);
    stallTimer = setTimeout(function () { if (video.readyState < 3) fail(); }, 12000);
  }

  // p: { url, title, show, src, logo }
  function play(p) {
    stop();
    state.playing = p;
    $('vod-player').hidden = false;
    $('stage').style.display = 'none';
    status('Yükleniyor…');
    var proxy = window.CONFIG.serviceUrl + '/hls?u=' + encodeURIComponent(p.url);
    if (/\.mp4(\?|$)/i.test(p.url) || !(window.Hls && Hls.isSupported())) {
      playNative(p.url);
    } else {
      playHls(p.url, function () {
        playHls(proxy, function () { playNative(p.url); });
      });
    }
    // Kaldığı yerden devam
    var saved = getProgress()[p.url];
    video.addEventListener('loadedmetadata', function seek() {
      video.removeEventListener('loadedmetadata', seek);
      if (saved && saved.t > 30 && saved.t < (video.duration || saved.d) - 60) video.currentTime = saved.t;
    });
    saveTimer = setInterval(function () {
      if (video.duration && video.currentTime > 5) saveProgress(p, video.currentTime, video.duration);
    }, 10000);
    showOsd();
  }

  function closePlayer() {
    if (state.playing && video.duration && video.currentTime > 5) saveProgress(state.playing, video.currentTime, video.duration);
    stop();
    state.playing = null;
    $('vod-player').hidden = true;
    $('stage').style.display = '';
    if (state.open && state.level === 'eps') renderEps();
    if (!state.open && window.APP) window.APP.refreshPreview();
  }

  function paintOsd() {
    var p = state.playing;
    if (!p) return;
    $('vod-osd-show').textContent = p.show;
    $('vod-osd-title').textContent = p.title;
    var d = video.duration || 0;
    $('vod-osd-time').textContent = fmt(video.currentTime) + (d ? ' / ' + fmt(d) : '');
    $('vod-osd-bar').style.width = d ? (video.currentTime / d * 100) + '%' : '0';
    $('vod-osd-state').textContent = video.paused ? 'Duraklatıldı' : '';
  }

  function showOsd() {
    paintOsd();
    $('vod-osd').classList.add('show');
    clearTimeout(osdTimer);
    osdTimer = setTimeout(function () { if (!video.paused) $('vod-osd').classList.remove('show'); }, 4000);
  }

  function seek(delta) {
    if (!video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration - 1, video.currentTime + delta));
    showOsd();
  }

  function togglePause() {
    if (video.paused) video.play().catch(function () {}); else video.pause();
    showOsd();
  }

  function episodePayload(srcIdx, show, ep) {
    return { url: ep.url, title: ep.title, show: show.name, src: srcIdx, logo: ep.logo || show.logo };
  }

  function nextEpisode(dir) {
    var p = state.playing;
    if (!p) return;
    var shows = cache[p.src];
    if (!shows) return;
    for (var i = 0; i < shows.length; i++) {
      var eps = shows[i].eps;
      for (var j = 0; j < eps.length; j++) {
        if (eps[j].url !== p.url) continue;
        var n = eps[j + dir];
        if (!n) { closePlayer(); return; }
        if (state.open) state.ep = j + dir;
        play(episodePayload(p.src, shows[i], n));
        return;
      }
    }
  }

  /* ---------- Tuşlar ---------- */
  function playerKey(code) {
    if (code === 13 || code === KEY.playPause || code === KEY.play || code === KEY.pause) togglePause();
    else if (code === 37 || code === KEY.rw) seek(-10);
    else if (code === 39 || code === KEY.ff) seek(30);
    else if (code === 38 || code === 40) showOsd();
    else if (code === KEY.chUp) nextEpisode(1);
    else if (code === KEY.chDown) nextEpisode(-1);
    else if (code === KEY.back || code === KEY.esc || code === KEY.stop) closePlayer();
    else return false;
    return true;
  }

  function browseKey(code) {
    var shows = state.shows || [];
    if (state.level === 'tabs') {
      if (code === 37) selectSource(state.src - 1);
      else if (code === 39) selectSource(state.src + 1);
      else if ((code === 40 || code === 13) && shows.length) { state.level = 'grid'; renderTabs(); paintGrid(); }
      else if (code === KEY.back || code === KEY.esc) close();
      else return false;
      return true;
    }
    if (state.level === 'grid') {
      if (code === 37) state.show = Math.max(0, state.show - 1);
      else if (code === 39) state.show = Math.min(shows.length - 1, state.show + 1);
      else if (code === 40) state.show = Math.min(shows.length - 1, state.show + COLS);
      else if (code === 38) {
        if (state.show < COLS) { state.level = 'tabs'; renderTabs(); }
        else state.show -= COLS;
      } else if (code === 13) {
        var s = shows[state.show];
        if (SOURCES[state.src].films) { play(episodePayload(state.src, s, s.eps[0])); return true; }
        // Yarım kalan bölüm varsa liste ondan açılsın
        var prog = getProgress();
        state.ep = 0;
        for (var i = s.eps.length - 1; i >= 0; i--) if (prog[s.eps[i].url]) { state.ep = i; break; }
        state.level = 'eps';
        renderEps();
        return true;
      } else if (code === KEY.back || code === KEY.esc) { state.level = 'tabs'; renderTabs(); }
      else return false;
      paintGrid();
      return true;
    }
    // Bölüm listesi
    var eps = shows[state.show].eps;
    if (code === 38) { state.ep = Math.max(0, state.ep - 1); scrollEps(); }
    else if (code === 40) { state.ep = Math.min(eps.length - 1, state.ep + 1); scrollEps(); }
    else if (code === 13) play(episodePayload(state.src, shows[state.show], eps[state.ep]));
    else if (code === 37 || code === KEY.back || code === KEY.esc) { state.level = 'grid'; renderGrid(); }
    else return false;
    return true;
  }

  window.VOD = {
    open: open,
    isOpen: function () { return state.open || !!state.playing; },
    key: function (code) { return state.playing ? playerKey(code) : browseKey(code); },
    recent: recent,
    // Ana ekrandaki "Devam et" satırından doğrudan oynat
    playRecent: function (p) {
      load(p.src, function () {});
      play({ url: p.url, title: p.title, show: p.show, src: p.src, logo: p.logo });
    }
  };
})();
