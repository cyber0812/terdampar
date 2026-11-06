import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os'; import zlib from 'zlib'; import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { WorldData } from '../shared/world.js'; import { Room } from './room.js'; import { startTunnel } from './tunnel.js';
const here = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const ROOT = fs.existsSync(path.join(here, 'public')) ? here : path.resolve(here, '..');
const ONLINE = !!process.env.ONLINE || process.argv.includes('--online'); let publicUrl = null;
const PUB = path.join(ROOT, 'public'), SAVE = path.join(ROOT, 'saves'), PORT = +(process.env.PORT || process.argv[2] || 3000);
const hb = fs.readFileSync(path.join(PUB, 'world/height.bin')); const world = new WorldData(new Uint16Array(hb.buffer, hb.byteOffset, hb.length / 2), JSON.parse(fs.readFileSync(path.join(PUB, 'world/pois.json'))), JSON.parse(fs.readFileSync(path.join(PUB, 'world/spawns.json'))));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u === '/info.json') { r.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return r.end(JSON.stringify({ url: publicUrl, online: ONLINE })); }
  let f = path.normalize(path.join(PUB, u)); if (!f.startsWith(PUB) || f.startsWith(path.join(PUB, 'lite'))) { r.writeHead(403); return r.end(); }
  const lite = /(^|;\s*)tlite=1/.test(q.headers.cookie || '') && /\.jpg$/.test(u); if (lite) { const lf = path.join(PUB, 'lite', u); if (fs.existsSync(lf)) f = lf; }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { r.writeHead(404); return r.end('404'); } const ext = path.extname(f), hdr = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': ext === '.html' || u.endsWith('game.js') ? 'no-cache' : 'private, max-age=3600', vary: 'Cookie, Accept-Encoding' };
    const zip = /gzip/.test(q.headers['accept-encoding'] || '') && ['.js', '.json', '.bin', '.glb', '.css', '.html'].includes(ext);
    if (zip) { r.writeHead(200, { ...hdr, 'content-encoding': 'gzip' }); fs.createReadStream(f).pipe(zlib.createGzip({ level: 4 })).pipe(r); } else { r.writeHead(200, { ...hdr, 'content-length': st.size }); fs.createReadStream(f).pipe(r); }
  });
});
const rooms = new Map(); const wss = new WebSocketServer({ server: srv, maxPayload: 1 << 20 });
const genCode = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s; do { s = ''; for (let i = 0; i < 5; i++) s += A[Math.random() * A.length | 0]; } while (rooms.has(s) || fs.existsSync(path.join(SAVE, s + '.json'))); return s; };
wss.on('connection', ws => {
  let room = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'ping') { ws.send(JSON.stringify({ t: 'pong', c: m.c })); return; }
    if (m.t === 'join' || m.t === 'create') {
      if (room) return; let code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (m.t === 'create') code = genCode(); else if (!rooms.has(code) && !fs.existsSync(path.join(SAVE, code + '.json'))) { ws.send(JSON.stringify({ t: 'err', m: 'Room tidak ditemukan' })); return; }
      if (!rooms.has(code)) { const R = new Room(code, world, SAVE); R.urlFn = () => publicUrl; rooms.set(code, R); } room = rooms.get(code); if (room.clients.size >= 10) { room = null; ws.send(JSON.stringify({ t: 'err', m: 'Room penuh (10 pemain)' })); return; } room.join(ws, m); return;
    }
    if (room) room.on(ws, m);
  });
  ws.on('close', () => room && room.leave(ws)); ws.on('error', () => { });
});
const DT = .05; setInterval(() => { for (const [code, r] of rooms) { if (r.clients.size || Date.now() - r.lastActive < 600000) { if (r.clients.size) r.lastActive = Date.now(); r.step(DT); } else { r.save(); rooms.delete(code); } } }, 50);
srv.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\n  ==============================================\n   CATLYN TERDAMPAR  -  server jalan\n  ==============================================\n');
  console.log(`   Di laptop ini : http://localhost:${PORT}`); for (const ip of ips) console.log(`   HP / teman WiFi: http://${ip}:${PORT}`); console.log('\n   Biarkan jendela ini terbuka selama main.\n');
  if (ONLINE) startTunnel(ROOT, PORT, url => { publicUrl = url; for (const r of rooms.values()) r.broadcast({ t: 'url', url }); if (url) console.log(`\n  ==============================================\n   LINK BUAT TEMAN (beda WiFi juga bisa):\n   ${url}\n  ==============================================\n   Kirim link ini + KODE room ke teman.\n   Kalau baru dibuka belum bisa, tunggu 10-20 detik lalu refresh.\n`); });
});
const saveAll = () => { for (const r of rooms.values()) r.save(); }; process.on('exit', saveAll); process.on('SIGINT', () => process.exit(0)); process.on('SIGTERM', () => process.exit(0));
