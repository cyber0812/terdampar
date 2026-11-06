// Phone-to-phone multiplayer: the host's browser runs the world, friends connect over WebRTC.
// Signaling goes through the free PeerJS cloud server; the wire protocol below is PeerJS's.
const Q = new URLSearchParams(location.search), SIG = Q.get('sig') || 'wss://0.peerjs.com:443/';
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }] };
export const PREFIX = 'catlyn-terdampar-';
const rid = () => Math.random().toString(36).slice(2, 10);
export const newCode = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.random() * A.length | 0]; return s; };
class Signal {
  constructor(id) { this.id = id; }
  open() {
    return new Promise((res, rej) => {
      let ws; try { ws = this.ws = new WebSocket(`${SIG}peerjs?key=peerjs&id=${encodeURIComponent(this.id)}&token=${rid()}&version=1.5.4`); } catch (e) { return rej(new Error('sig')); }
      const to = setTimeout(() => { rej(new Error('sig')); try { ws.close(); } catch { } }, 12000);
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.type === 'OPEN') { clearTimeout(to); res(); } else if (m.type === 'ID-TAKEN') { clearTimeout(to); rej(new Error('taken')); } else if (m.type === 'ERROR') { clearTimeout(to); rej(new Error('sig')); } else this.onMsg && this.onMsg(m); };
      ws.onerror = () => { clearTimeout(to); rej(new Error('sig')); }; ws.onclose = () => { clearInterval(this.hb); this.onClose && this.onClose(); };
      this.hb = setInterval(() => { if (ws.readyState === 1) ws.send('{"type":"HEARTBEAT"}'); }, 5000);
    });
  }
  send(type, dst, payload) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ type, dst, payload })); }
  close() { clearInterval(this.hb); this.onClose = null; try { this.ws.close(); } catch { } }
}
// DataChannel with chunking for big messages (the welcome state)
const CH = 15000;
function wrap(dc, onMessage) {
  const parts = {}; let seq = 0;
  dc.onmessage = e => { const s = e.data; if (typeof s !== 'string') return; if (s.charCodeAt(0) === 1) { const j = s.indexOf('|'), [id, i, n] = s.slice(1, j).split(','), a = parts[id] || (parts[id] = { got: 0, d: [] }); if (a.d[+i] === undefined) { a.d[+i] = s.slice(j + 1); a.got++; } if (a.got === +n) { delete parts[id]; onMessage(a.d.join('')); } } else onMessage(s); };
  return {
    get readyState() { return dc.readyState === 'open' ? 1 : 3; },
    send(s) { if (dc.readyState !== 'open') return; if (dc.bufferedAmount > 2e6 && s.startsWith('{"t":"s"')) return; try { if (s.length <= CH) { dc.send(s); return; } const id = (seq++).toString(36), n = Math.ceil(s.length / CH); for (let i = 0; i < n; i++) dc.send(`\u0001${id},${i},${n}|` + s.slice(i * CH, (i + 1) * CH)); } catch { } },
    close() { try { dc.close(); } catch { } },
  };
}
export class Host {
  constructor(room, onStatus) { this.room = room; this.peers = new Map(); this.onStatus = onStatus; this.code = null; this.alive = true; addEventListener('pagehide', () => { for (const s of this.peers.values()) { try { s.conn?.close(); s.pc.close(); } catch { } } }); }
  async start(code) {
    for (let t = 0; t < 4; t++) {
      const s = new Signal(PREFIX + code);
      try { await s.open(); this.sig = s; this.code = code; s.onMsg = m => this.onSig(m); s.onClose = () => this.lost(); this.onStatus('on', code); return code; }
      catch (e) { s.close(); if (e.message === 'taken') { code = newCode(); continue; } this.onStatus('off', code); this.retry(code); return null; }
    }
  }
  lost() { if (!this.alive) return; this.onStatus('off', this.code); this.retry(this.code); }
  retry(code) { clearTimeout(this.rt); this.rt = setTimeout(() => { if (this.alive && !document.hidden) this.start(code); else this.retry(code); }, 5000); }
  onSig(m) { const src = m.src, p = m.payload || {}; if (!src) return; if (m.type === 'OFFER') this.accept(src, p).catch(() => this.drop(src)); else if (m.type === 'CANDIDATE') this.peers.get(src)?.add(p.candidate); }
  async accept(src, p) {
    this.drop(src); const pc = new RTCPeerConnection(ICE), st = { pc, q: [], ready: false }; st.add = c => { if (!c) return; st.ready ? pc.addIceCandidate(c).catch(() => { }) : st.q.push(c); }; this.peers.set(src, st);
    pc.onicecandidate = e => { if (e.candidate) this.sig?.send('CANDIDATE', src, { candidate: e.candidate.toJSON() }); };
    pc.ondatachannel = e => this.bind(src, e.channel, st); pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) this.drop(src); };
    await pc.setRemoteDescription(p.sdp); st.ready = true; for (const c of st.q) pc.addIceCandidate(c).catch(() => { });
    await pc.setLocalDescription(await pc.createAnswer()); this.sig?.send('ANSWER', src, { sdp: pc.localDescription });
  }
  bind(src, dc, st) {
    const conn = wrap(dc, s => { let m; try { m = JSON.parse(s); } catch { return; } if (m.t === 'join' || m.t === 'create') { if (st.joined) return; if (this.room.clients.size >= 8) { conn.send('{"t":"err","m":"Room penuh (8 pemain)"}'); return; } st.joined = true; this.room.join(conn, { ...m, t: 'join' }); return; } if (st.joined) { try { this.room.on(conn, m); } catch (e) { console.error(e); } } });
    st.conn = conn; dc.onclose = () => this.drop(src);
  }
  drop(src) { const st = this.peers.get(src); if (!st) return; this.peers.delete(src); if (st.joined) { st.joined = false; this.room.leave(st.conn); } try { st.pc.close(); } catch { } }
  count() { let n = 0; for (const s of this.peers.values()) if (s.joined) n++; return n; }
}
export async function joinRoom(code, onMessage, onClose) {
  const sig = new Signal('ct-' + rid() + rid()), host = PREFIX + code; await sig.open();
  const pc = new RTCPeerConnection(ICE), dc = pc.createDataChannel('g', { ordered: true }), q = []; let ready = false, done = false;
  const fail = (rej, msg) => { if (done) return; done = true; sig.close(); try { pc.close(); } catch { } rej(new Error(msg)); };
  return new Promise(async (res, rej) => {
    const to = setTimeout(() => fail(rej, 'timeout'), 25000);
    pc.onicecandidate = e => { if (e.candidate) sig.send('CANDIDATE', host, { candidate: e.candidate.toJSON() }); };
    sig.onMsg = async m => { if (m.src !== host) { if (m.type === 'EXPIRE') { clearTimeout(to); fail(rej, 'notfound'); } return; } if (m.type === 'ANSWER') { await pc.setRemoteDescription(m.payload.sdp); ready = true; for (const c of q) pc.addIceCandidate(c).catch(() => { }); } else if (m.type === 'CANDIDATE') { const c = m.payload?.candidate; if (c) ready ? pc.addIceCandidate(c).catch(() => { }) : q.push(c); } else if (m.type === 'EXPIRE' || m.type === 'LEAVE') { clearTimeout(to); fail(rej, 'notfound'); } };
    dc.onopen = () => { if (done) return; done = true; clearTimeout(to); const conn = wrap(dc, onMessage); let closed = false; const bye = () => { if (closed) return; closed = true; onClose(); }; dc.onclose = bye; pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) setTimeout(() => { if (pc.connectionState !== 'connected') bye(); }, pc.connectionState === 'disconnected' ? 6000 : 0); }; setTimeout(() => sig.close(), 4000); res(conn); };
    try { await pc.setLocalDescription(await pc.createOffer()); sig.send('OFFER', host, { sdp: pc.localDescription }); } catch { clearTimeout(to); fail(rej, 'timeout'); }
  });
}
