// Local stand-in for the PeerJS cloud signaling server, same wire protocol.
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { WebSocketServer } = require('ws');
const port = +process.argv[2] || 9100, clients = new Map(), queue = new Map();
const wss = new WebSocketServer({ port });
wss.on('connection', (ws, req) => {
  const u = new URL(req.url, 'http://x'), id = u.searchParams.get('id'), token = u.searchParams.get('token'), key = u.searchParams.get('key');
  if (!u.pathname.endsWith('/peerjs') || !id || !token || key !== 'peerjs') { ws.send(JSON.stringify({ type: 'ERROR', payload: { msg: 'bad' } })); return ws.close(); }
  if (clients.has(id)) { ws.send(JSON.stringify({ type: 'ID-TAKEN', payload: { msg: 'ID is taken' } })); return ws.close(); }
  clients.set(id, ws); ws.send(JSON.stringify({ type: 'OPEN' })); console.log('open', id);
  for (const m of queue.get(id) || []) ws.send(JSON.stringify(m)); queue.delete(id);
  ws.on('message', d => { const m = JSON.parse(d); if (m.type === 'HEARTBEAT') return; m.src = id; const t = clients.get(m.dst); if (t) t.send(JSON.stringify(m)); else if (m.dst) { const q = queue.get(m.dst) || []; q.push(m); queue.set(m.dst, q); setTimeout(() => { const qq = queue.get(m.dst); if (qq && qq.includes(m)) { qq.splice(qq.indexOf(m), 1); ws.send(JSON.stringify({ type: 'EXPIRE', src: m.dst, dst: id })); } }, 5000); } });
  ws.on('close', () => { if (clients.get(id) === ws) clients.delete(id); console.log('close', id); });
});
console.log('mock signaling on', port);
