// TizenBrew servis dosyası: TV üzerinde Node.js ile çalışır.
// - /key?k=KEY_HDMI1 → TV'ye uzaktan kumanda tuşu gönderir (HDMI, kaynak, ayarlar)
// Eski Node sürümleriyle uyumlu kalması için ES5 yazıldı.
var http = require('http');
var tls = require('tls');
var crypto = require('crypto');
var urlLib = require('url');

var PORT = 8091;

function buf(s, enc) { return Buffer.from ? Buffer.from(s, enc) : new Buffer(s, enc); }

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(obj));
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

function sendKey(key, token, cb) {
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

  var sock = tls.connect({ host: '127.0.0.1', port: 8002, rejectUnauthorized: false }, function () {
    sock.write(
      'GET ' + path + ' HTTP/1.1\r\n' +
      'Host: 127.0.0.1:8002\r\n' +
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

/* ---------- Sunucu ---------- */
http.createServer(function (req, res) {
  var u = urlLib.parse(req.url, true);
  if (u.pathname === '/key') return handleKey(u.query, res);
  if (u.pathname === '/ping') return send(res, 200, { ok: true });
  send(res, 404, { error: 'not found' });
}).listen(PORT, '127.0.0.1');
