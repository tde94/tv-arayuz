#!/usr/bin/env node
// Ulusal kanalların yayın verip vermediğini kontrol eder: ana listeyi, kalite listesini
// ve bir görüntü parçasını indirmeyi dener. Sonucu tools/kanal-kontrol.txt'ye yazar,
// açılmayan kanal varsa Mac'e bildirim gönderir.
// Kullanım: node tools/check-channels.js [grup]   (varsayılan: Ulusal)
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const GROUP = process.argv[2] || 'Ulusal';
const ROOT = path.join(__dirname, '..');
const REPORT = path.join(__dirname, 'kanal-kontrol.txt');
const UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/7.0 TV Safari/537.36';

const window = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'app/channels.js'), 'utf8'))(window);
const channels = window.CHANNELS.filter(c => c.group === GROUP);

async function get(url, ms = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return { url: r.url, body: Buffer.from(await r.arrayBuffer()) };
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'cevap yok' : e.message);
  } finally {
    clearTimeout(timer);
  }
}

const lastUri = (text, base) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  return lines.length ? new URL(lines[lines.length - 1], base).href : null;
};

async function check(ch) {
  let pl = await get(ch.url);
  let text = pl.body.toString();
  if (!text.includes('#EXTM3U')) throw new Error('liste değil');
  if (text.includes('#EXT-X-STREAM-INF')) {
    // En düşük kaliteyi dene: en hızlı cevap veren o
    pl = await get(lastUri(text, pl.url));
    text = pl.body.toString();
  }
  const seg = lastUri(text, pl.url);
  if (!seg) throw new Error('parça yok');
  const s = await get(seg, 20000);
  if (s.body.length < 1000) throw new Error('parça boş');
}

(async () => {
  const results = await Promise.all(channels.map(ch =>
    check(ch).then(() => [ch.name, null], e => [ch.name, e.message])));
  const bad = results.filter(r => r[1]);
  const stamp = new Date().toLocaleString('tr-TR');
  const lines = [`${stamp} · ${GROUP}: ${results.length - bad.length}/${results.length} kanal yayında`, '']
    .concat(results.map(([n, err]) => `${err ? '✗' : '✓'} ${n}${err ? '  (' + err + ')' : ''}`));
  fs.writeFileSync(REPORT, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  if (bad.length && process.platform === 'darwin') {
    const msg = 'Açılmayan: ' + bad.map(b => b[0]).join(', ');
    execFile('osascript', ['-e', `display notification ${JSON.stringify(msg)} with title "TV kanal kontrolü"`]);
  }
})();
