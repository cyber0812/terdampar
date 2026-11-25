// ===== Jaringan: PeerJS (online) atau BroadcastChannel (tes lokal) =====
import { Peer } from 'peerjs';

const PREFIX = 'warungkompak-v1-';
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
] };
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return s; }
export function cleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); }

// Host: terima koneksi. handlers: onJoin(cid), onData(cid,msg), onLeave(cid)
export function hostRoom(useLocal, h) {
  return new Promise((resolve, reject) => {
    if (useLocal) return resolve(localHost(makeCode(), h));
    let tries = 0;
    const attempt = () => {
      const code = makeCode();
      const peer = new Peer(PREFIX + code, { config: ICE, debug: 0 });
      const conns = new Map();
      let opened = false;
      const api = {
        code, local: false,
        send(cid, m) { const c = conns.get(cid); if (c && c.open) try { c.send(m); } catch (e) {} },
        broadcast(m) { for (const c of conns.values()) if (c.open) try { c.send(m); } catch (e) {} },
        kick(cid) { const c = conns.get(cid); if (c) c.close(); },
        count() { return conns.size; },
        close() { try { peer.destroy(); } catch (e) {} },
      };
      peer.on('open', () => { opened = true; resolve(api); });
      peer.on('connection', conn => {
        const cid = conn.peer;
        conn.on('open', () => { conns.set(cid, conn); h.onJoin(cid); });
        conn.on('data', d => h.onData(cid, d));
        const bye = () => { if (conns.has(cid)) { conns.delete(cid); h.onLeave(cid); } };
        conn.on('close', bye); conn.on('error', bye);
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
      peer.on('error', err => {
        if (!opened && err.type === 'unavailable-id' && tries++ < 4) { peer.destroy(); attempt(); return; }
        if (!opened) { peer.destroy(); reject(err); }
      });
      setTimeout(() => { if (!opened) { try { peer.destroy(); } catch (e) {} reject(new Error('timeout')); } }, 12000);
    };
    attempt();
  });
}

// Guest: gabung ke kode. handlers: onData(msg), onClose()
export function joinRoom(code, useLocal, h) {
  return new Promise((resolve, reject) => {
    if (useLocal) return resolve(localGuest(code, h));
    const peer = new Peer({ config: ICE, debug: 0 });
    let done = false, conn = null;
    const fail = e => { if (!done) { done = true; try { peer.destroy(); } catch (x) {} reject(e); } };
    peer.on('open', () => {
      conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      conn.on('open', () => {
        done = true;
        resolve({ send(m) { if (conn.open) try { conn.send(m); } catch (e) {} }, close() { try { peer.destroy(); } catch (e) {} } });
      });
      conn.on('data', d => h.onData(d));
      conn.on('close', () => { if (done) h.onClose(); });
      conn.on('error', e => { if (done) h.onClose(); else fail(e); });
    });
    peer.on('error', err => { if (!done) fail(err); else if (err.type !== 'peer-unavailable') h.onClose(); });
    setTimeout(() => fail(new Error('timeout')), 15000);
  });
}

// ---- transport lokal (dua tab di browser yang sama) ----
function localHost(code, h) {
  const bc = new BroadcastChannel('wk-' + code);
  const seen = new Map();
  bc.onmessage = e => {
    const { from, to, m } = e.data || {};
    if (to !== 'host') return;
    if (m && m.__join) { seen.set(from, Date.now()); h.onJoin(from); return; }
    if (m && m.__bye) { if (seen.delete(from)) h.onLeave(from); return; }
    seen.set(from, Date.now());
    h.onData(from, m);
  };
  const iv = setInterval(() => { const now = Date.now(); for (const [cid, t] of seen) if (now - t > 5000) { seen.delete(cid); h.onLeave(cid); } }, 1000);
  return {
    code, local: true,
    send(cid, m) { bc.postMessage({ to: cid, m }); },
    broadcast(m) { bc.postMessage({ to: '*', m }); },
    kick(cid) { bc.postMessage({ to: cid, m: { t: 'kick' } }); },
    count() { return seen.size; },
    close() { clearInterval(iv); bc.postMessage({ to: '*', m: { t: 'bye' } }); bc.close(); },
  };
}
function localGuest(code, h) {
  const bc = new BroadcastChannel('wk-' + code);
  const me = 'g' + Math.random().toString(36).slice(2, 8);
  let last = Date.now();
  bc.onmessage = e => {
    const { to, m } = e.data || {};
    if (to !== '*' && to !== me) return;
    last = Date.now();
    if (m && m.t === 'bye') { h.onClose(); return; }
    h.onData(m);
  };
  bc.postMessage({ from: me, to: 'host', m: { __join: 1 } });
  const iv = setInterval(() => { if (Date.now() - last > 6000) { clearInterval(iv); h.onClose(); } }, 1000);
  addEventListener('beforeunload', () => bc.postMessage({ from: me, to: 'host', m: { __bye: 1 } }));
  return { send(m) { bc.postMessage({ from: me, to: 'host', m }); }, close() { clearInterval(iv); bc.postMessage({ from: me, to: 'host', m: { __bye: 1 } }); bc.close(); } };
}
