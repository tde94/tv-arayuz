// TizenBrewInstaller'ı (localhost:8091) WebSocket ile sürer:
// TV'ye bağlanır, AnaEkran.wgt'yi yerel dosya yolundan kurar.
// "Dosya seç" yolu kurulum sonrası sertifikayı sildiği için InstallPackage kullanılıyor.
const { execFile } = require('child_process');

const TV_IP = process.argv[2];
const WGT = process.argv[3];
const LOGIN_URL = 'https://account.samsung.com/mobile/account/check.do?serviceID=v285zxnl3h&actionID=StartOAuth2&accessToken=Y&redirect_uri=http://localhost:4794/signin/callback';
const E = { InstallPackage: 1, Error: 3, InstallationStatus: 4, ConnectToTV: 6 };

const ws = new WebSocket('ws://localhost:8091');
const send = (type, payload) => ws.send(JSON.stringify({ type, payload }));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

ws.onopen = () => { log('installer connected'); send(E.ConnectToTV, TV_IP); };
ws.onerror = (e) => { log('ws error', e.message || e); process.exit(1); };
ws.onmessage = (m) => {
  const { type, payload } = JSON.parse(m.data);
  log('<-', type, JSON.stringify(payload).slice(0, 300));
  if (type === E.ConnectToTV) {
    if (!payload || !payload.success) { log('TV connection failed'); return process.exit(1); }
    setTimeout(() => send(E.InstallPackage, { url: WGT }), 1500);
  } else if (type === E.InstallPackage && payload && payload.response === 2) {
    log('certificate missing, opening Samsung login');
    execFile('open', [LOGIN_URL]);
  } else if (type === E.InstallPackage && payload && payload.response === 1) {
    log('certificate created, installing');
    send(E.InstallPackage, { url: WGT });
  }
};
setTimeout(() => { log('timeout'); process.exit(0); }, 15 * 60 * 1000);
