// TV üzerinde Node.js ile çalışan servis. İki şekilde çalışır:
// TizenBrew modülünün servis dosyası olarak ya da bağımsız uygulamanın Tizen servisi olarak.
// - /launch?ids=…&name=… → uygulama açar
// - /key?k=KEY_HDMI1     → TV'ye uzaktan kumanda tuşu gönderir (HDMI, kaynak, ayarlar)
// - /hls?u=…             → canlı yayın aracısı (CORS izni vermeyen kanallar için)
// Eski Node sürümleriyle uyumlu kalması için ES5 yazıldı.
var http = require('http');
var https = require('https');
var tls = require('tls');
var crypto = require('crypto');
var urlLib = require('url');

var PORT = 8095;

function buf(s, enc) { return Buffer.from ? Buffer.from(s, enc) : new Buffer(s, enc); }

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(obj));
}

/* ---------- Canlı yayın aracısı ---------- */
// Bazı kanallar tarayıcıya CORS izni vermiyor; oynatıcı yayını buradan çeker.
// Oynatma listelerindeki adresler yine bu aracıya yönlendirilir.
function proxyUrl(u) { return 'http://127.0.0.1:' + PORT + '/hls?u=' + encodeURIComponent(u); }

function rewritePlaylist(text, base) {
  return text.split('\n').map(function (line) {
    var l = line.trim();
    if (!l) return line;
    if (l.charAt(0) === '#') {
      // #EXT-X-KEY, #EXT-X-MEDIA gibi satırlardaki URI="…" değerleri
      return line.replace(/URI="([^"]+)"/g, function (m, u) { return 'URI="' + proxyUrl(urlLib.resolve(base, u)) + '"'; });
    }
    return proxyUrl(urlLib.resolve(base, l));
  }).join('\n');
}

function fetchUpstream(target, redirects, cb) {
  var o = urlLib.parse(target);
  o.headers = { 'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0)' };
  var lib = o.protocol === 'http:' ? http : https;
  lib.get(o, function (r) {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirects < 5) {
      r.resume();
      return fetchUpstream(urlLib.resolve(target, r.headers.location), redirects + 1, cb);
    }
    cb(null, r, target);
  }).on('error', cb);
}

function handleHls(q, res) {
  var target = q.u || '';
  if (!/^https?:\/\//.test(target)) return send(res, 400, { error: 'url' });
  fetchUpstream(target, 0, function (err, up, finalUrl) {
    if (err) return send(res, 502, { error: err.message });
    var type = up.headers['content-type'] || '';
    var isPlaylist = /mpegurl/i.test(type) || /\.m3u8(\?|$)/i.test(urlLib.parse(finalUrl).pathname || '');
    if (!isPlaylist) {
      res.writeHead(up.statusCode, { 'Content-Type': type || 'video/mp2t', 'Access-Control-Allow-Origin': '*' });
      return up.pipe(res);
    }
    var body = '';
    up.setEncoding('utf8');
    up.on('data', function (c) { body += c; });
    up.on('end', function () {
      res.writeHead(up.statusCode, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Access-Control-Allow-Origin': '*' });
      res.end(rewritePlaylist(body, finalUrl));
    });
  });
}

/* ---------- Samsung uzaktan kumanda (WebSocket, port 8002) ---------- */
// Küçük bir WebSocket istemcisi: yalnızca metin çerçevesi gönderip alır.
function wsFrame(text) {
  var payload = buf(text, 'utf8');
  var len = payload.length;
  var header;
  if (len < 126) {
    header = buf([0x81, 0x80 | len]);
  } else {
    header = buf([0x81, 0x80 | 126, (len >> 8) & 0xff, len & 0xff]);
  }
  var mask = crypto.randomBytes(4);
  var masked = Buffer.alloc ? Buffer.alloc(len) : new Buffer(len);
  for (var i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}

function readFrames(state, chunk, onText) {
  state.buf = Buffer.concat([state.buf, chunk]);
  while (state.buf.length >= 2) {
    var b = state.buf;
    var len = b[1] & 0x7f;
    var off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = b.readUInt32BE(6); off = 10; }
    if (b.length < off + len) return;
    if ((b[0] & 0x0f) === 1) onText(b.slice(off, off + len).toString('utf8'));
    state.buf = b.slice(off + len);
  }
}

// TV, 127.0.0.1'den gelen bağlantıları "host" sayıyor ve tuşlarını uygulamıyor.
// Bu yüzden TV'ye kendi ağ adresinden, dışarıdan bir cihaz gibi bağlanıyoruz.
var tvIp = null;

function getTvIp(cb) {
  if (tvIp) return cb(tvIp);
  http.get('http://127.0.0.1:8001/api/v2/', function (r) {
    var d = '';
    r.setEncoding('utf8');
    r.on('data', function (c) { d += c; });
    r.on('end', function () {
      try { tvIp = JSON.parse(d).device.ip || null; } catch (e) {}
      cb(tvIp || '127.0.0.1');
    });
  }).on('error', function () { cb('127.0.0.1'); });
}

function sendKey(key, token, cb) {
  getTvIp(function (host) { sendKeyTo(host, key, token, cb); });
}

function sendKeyTo(host, key, token, cb) {
  var name = buf('Ana Ekran', 'utf8').toString('base64');
  var path = '/api/v2/channels/samsung.remote.control?name=' + encodeURIComponent(name) +
    (token ? '&token=' + encodeURIComponent(token) : '');
  var finished = false;
  function finish(result) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { sock.end(); } catch (e) {}
    cb(result);
  }
  // İlk bağlantıda TV izin sorar; kullanıcıya 30 sn tanı
  var timer = setTimeout(function () { finish({ ok: false, error: 'timeout' }); }, 30000);

  var sock = tls.connect({ host: host, port: 8002, rejectUnauthorized: false }, function () {
    sock.write(
      'GET ' + path + ' HTTP/1.1\r\n' +
      'Host: ' + host + ':8002\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Key: ' + crypto.randomBytes(16).toString('base64') + '\r\n' +
      'Sec-WebSocket-Version: 13\r\n\r\n'
    );
  });

  var handshaken = false;
  var state = { buf: buf('', 'utf8') };
  sock.on('data', function (chunk) {
    if (!handshaken) {
      var s = chunk.toString('binary');
      var end = s.indexOf('\r\n\r\n');
      if (end < 0) return;
      if (s.indexOf(' 101 ') < 0) return finish({ ok: false, error: 'handshake' });
      handshaken = true;
      chunk = chunk.slice(end + 4);
      if (!chunk.length) return;
    }
    readFrames(state, chunk, function (text) {
      var msg;
      try { msg = JSON.parse(text); } catch (e) { return; }
      if (msg.event === 'ms.channel.connect') {
        var newToken = (msg.data && msg.data.token) || token;
        sock.write(wsFrame(JSON.stringify({
          method: 'ms.remote.control',
          params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' }
        })));
        setTimeout(function () { finish({ ok: true, token: newToken }); }, 300);
      } else if (msg.event === 'ms.channel.unauthorized') {
        finish({ ok: false, error: 'unauthorized' });
      }
    });
  });
  sock.on('error', function () { finish({ ok: false, error: 'connect' }); });
}

function handleKey(q, res) {
  var key = q.k || '';
  if (!/^KEY_[A-Z0-9_]+$/.test(key)) return send(res, 400, { ok: false, error: 'key' });
  sendKey(key, q.token || '', function (result) { send(res, 200, result); });
}

/* ---------- Uygulama başlatma ---------- */
// Modül sayfası TV'nin tizen arayüzüne erişemiyor; servis erişebiliyor.
function launchIds(ids, cb) {
  if (!ids.length) return cb(false);
  tizen.application.launch(ids[0], function () { cb(true); }, function () { launchIds(ids.slice(1), cb); });
}

function handleLaunch(q, res) {
  if (typeof tizen === 'undefined') return send(res, 500, { ok: false, error: 'no-tizen' });
  var ids = (q.ids || '').split(',').filter(Boolean);
  var name = (q.name || '').toLowerCase();
  try {
    launchIds(ids, function (ok) {
      if (ok) return send(res, 200, { ok: true });
      // Kimlik tutmadıysa yüklü uygulamalar arasında isimle ara
      tizen.application.getAppsInfo(function (list) {
        var hit = list.filter(function (a) { return a.name && a.name.toLowerCase().indexOf(name) >= 0; })[0];
        if (!hit) return send(res, 200, { ok: false, error: 'not-found' });
        tizen.application.launch(hit.id,
          function () { send(res, 200, { ok: true, id: hit.id }); },
          function (e) { send(res, 200, { ok: false, error: e && e.message }); });
      }, function (e) { send(res, 200, { ok: false, error: e && e.message }); });
    });
  } catch (e) {
    send(res, 200, { ok: false, error: e.message });
  }
}

/* ---------- Sunucu ---------- */
var server = http.createServer(function (req, res) {
  var u = urlLib.parse(req.url, true);
  if (u.pathname === '/hls') return handleHls(u.query, res);
  if (u.pathname === '/launch') return handleLaunch(u.query, res);
  if (u.pathname === '/key') return handleKey(u.query, res);
  if (u.pathname === '/ping') return send(res, 200, { ok: true });
  send(res, 404, { error: 'not found' });
});
// Modül yeniden açıldığında eski servis hâlâ portu tutuyorsa çökme
server.on('error', function () {});
server.listen(PORT, '127.0.0.1');

// Tizen servis yaşam döngüsü (bağımsız uygulamada çağrılır; sunucu yukarıda zaten başladı)
module.exports.onStart = function () {};
module.exports.onRequest = function () {};
module.exports.onExit = function () {};
