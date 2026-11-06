// Opens a free Cloudflare quick tunnel so friends on other networks can join.
import fs from 'fs'; import path from 'path'; import https from 'https'; import zlib from 'zlib'; import { spawn, spawnSync } from 'child_process';
const REL = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';
function asset() {
  const p = process.platform, a = process.arch;
  if (p === 'win32') return { f: a === 'ia32' ? 'cloudflared-windows-386.exe' : 'cloudflared-windows-amd64.exe', bin: 'cloudflared.exe' };
  if (p === 'darwin') return { f: a === 'arm64' ? 'cloudflared-darwin-arm64.tgz' : 'cloudflared-darwin-amd64.tgz', bin: 'cloudflared', tgz: true };
  return { f: a === 'arm64' ? 'cloudflared-linux-arm64' : 'cloudflared-linux-amd64', bin: 'cloudflared' };
}
function get(url, onProg, hops = 0) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'user-agent': 'catlyn-terdampar' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && hops < 8) { r.resume(); return res(get(new URL(r.headers.location, url).href, onProg, hops + 1)); }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      const tot = +r.headers['content-length'] || 0, ch = []; let got = 0;
      r.on('data', d => { ch.push(d); got += d.length; onProg && onProg(got, tot); }); r.on('end', () => res(Buffer.concat(ch))); r.on('error', rej);
    }).on('error', rej);
  });
}
export function untar(buf, name) {
  for (let o = 0; o + 512 <= buf.length;) {
    const h = buf.subarray(o, o + 512), n = h.subarray(0, 100).toString('latin1').split('\0')[0]; if (!n) break;
    const size = parseInt(h.subarray(124, 136).toString('latin1').split('\0')[0].trim() || '0', 8), type = h[156];
    if (path.basename(n) === name && type !== 53) return buf.subarray(o + 512, o + 512 + size);
    o += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('cloudflared tidak ada di arsip');
}
async function binary(dir) {
  if (process.env.CLOUDFLARED) return process.env.CLOUDFLARED;
  const A = asset(), p = path.join(dir, A.bin); if (fs.existsSync(p)) return p;
  try { if (spawnSync('cloudflared', ['--version'], { stdio: 'ignore', timeout: 8000 }).status === 0) return 'cloudflared'; } catch { }
  console.log('   Download Cloudflare Tunnel (sekali saja, sekitar 20-60 MB)...');
  let last = -1; const buf = await get(REL + A.f, (g, t) => { const pc = t ? Math.floor(g / t * 100) : 0; if (pc !== last && pc % 5 === 0) { last = pc; process.stdout.write(`\r   ${pc}%   `); } }); process.stdout.write('\r   100%   \n');
  const data = A.tgz ? untar(zlib.gunzipSync(buf), 'cloudflared') : buf;
  fs.writeFileSync(p + '.part', data); fs.renameSync(p + '.part', p); try { fs.chmodSync(p, 0o755); } catch { }
  return p;
}
export async function startTunnel(dir, port, onUrl) {
  let bin; try { bin = await binary(dir); } catch (e) { console.log(`\n   Gagal download Cloudflare Tunnel (${e.message}).\n   Main lewat WiFi yang sama tetap bisa.\n`); return; }
  let tries = 0, alive = true, cur = null; const stop = () => { alive = false; try { cur && cur.kill(); } catch { } }; process.on('exit', stop);
  const run = () => {
    const ch = cur = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }); let url = null, log = '';
    const scan = d => { const s = d.toString(); log = (log + s).slice(-4000); const m = s.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com/); if (m && !url) { url = m[0]; ch.okAt = Date.now(); onUrl(url); } };
    ch.stdout.on('data', scan); ch.stderr.on('data', scan);
    ch.on('error', e => console.log('   Cloudflare Tunnel tidak bisa jalan:', e.message));
    ch.on('exit', code => { if (!alive) return; if (url) onUrl(null); if (ch.okAt && Date.now() - ch.okAt > 60000) tries = 0; if (++tries > 3) { console.log('\n   Link online belum bisa dibuat. Cek internet laptop, lalu tutup dan jalankan ulang file Main-Online.\n   Main lewat WiFi yang sama tetap bisa.\n\n   Detail:\n' + log.split('\n').filter(Boolean).slice(-3).join('\n')); return; } console.log(url ? `\n   Link online terputus, membuat link baru (${tries}/3)...` : `   Gagal membuat link online, mencoba lagi (${tries}/3)...`); setTimeout(run, 4000); });
    
  };
  console.log('   Membuat link online...'); run();
}
