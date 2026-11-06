import fs from 'fs'; import path from 'path';
import { ITEMS, CRAFT, BUILD, entDef, LOOT, ANIMALS, STAT, START_INV, SLOTS, HOTBAR, CHEST_SLOTS, PART_INFO, PLANE_FUEL, STORM_SEC, GROW_SEC, CAR_FRAME_COST } from '../shared/data.js';
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), rand = (a, b) => a + Math.random() * (b - a), dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;
export class Room {
  constructor(code, world, saveDir) {
    this.code = code; this.world = world; this.saveDir = saveDir; this.clients = new Map(); this.nextId = 1; this.tick = 0; this.lastActive = Date.now();
    const st = this.st = { v: 2, time: .3, day: 1, rain: 0, rainTarget: 0, rainNext: 500, cover: .35, dead: {}, hp: {}, drops: [], structs: [], cars: [], players: {}, plane: { parts: {}, fuel: 0, phase: 'wreck', boarded: [] }, parts: {}, nid: 1, started: Date.now() };
    for (const [k, p] of Object.entries(world.pois.parts)) st.parts[k] = { x: p.x, y: p.y, z: p.z, carrier: null, car: null, installed: false, found: false };
    this.load(); this.animals = []; this.spawnAll();
  }
  file() { return path.join(this.saveDir, this.code + '.json'); }
  load() { try { const d = JSON.parse(fs.readFileSync(this.file())); if (d.v === 2) { this.st = { ...this.st, ...d, parts: { ...this.st.parts, ...d.parts } }; for (const p of Object.values(this.st.parts)) p.carrier = null; for (const c of this.st.cars) { c.driver = null; c.seats = []; } this.st.plane.boarded = []; if (this.st.plane.phase === 'takeoff') this.st.plane.phase = 'ready'; } } catch { } }
  save() { try { fs.mkdirSync(this.saveDir, { recursive: true }); fs.writeFileSync(this.file() + '.tmp', JSON.stringify(this.st, (k, v) => (k === 'conn' || k === 'veh' || k === 'resting' || k === '__crouch' || k === 'crouch') ? undefined : v)); fs.renameSync(this.file() + '.tmp', this.file()); } catch (e) { console.log('save failed', e.message); } }
  id() { return this.st.nid++; }
  // ---- animals
  spawnAll() { for (const [sp, d] of Object.entries(ANIMALS)) for (let i = 0; i < d.count; i++) this.spawnAnimal(sp); }
  landSpot(sp) {
    const w = this.world, dens = w.pois.wolfDens;
    for (let t = 0; t < 40; t++) {
      let x, z; if (sp === 'Wolf') { const d = dens[R(0, dens.length - 1)], a = rand(0, 6.28), r = rand(4, 46); x = d.x + Math.cos(a) * r; z = d.z + Math.sin(a) * r; } else { x = rand(-640, 640); z = rand(-640, 640); }
      const h = w.height(x, z); if (h < 3 || h > 75 || w.waterLevel(x, z) !== null) continue; if (dist2(x, z, w.pois.spawn.x, w.pois.spawn.z) < 110 * 110) continue; return [x, z];
    } return [0, 0];
  }
  spawnAnimal(sp) { const [x, z] = this.landSpot(sp); const a = { id: this.nextId++, sp, x, z, y: this.world.height(x, z), h: rand(0, 6.28), s: 0, st: 'idle', tm: rand(1, 6), hp: ANIMALS[sp].hp, tgt: null, home: [x, z], atk: 0 }; this.animals.push(a); return a; }
  stepAnimal(a, dt, players) {
    const d = ANIMALS[a.sp], w = this.world; a.tm -= dt; a.atk -= dt;
    if (a.st === 'dead') { if (a.tm < (a.raid ? -30 : -120)) { this.animals.splice(this.animals.indexOf(a), 1); if (!a.raid) this.spawnAnimal(a.sp); } return; }
    let near = null, nd = 1e9; for (const p of players) { if (p.dead || p.veh) continue; const q = dist2(a.x, a.z, p.x, p.z); if (q < nd) { nd = q; near = p; } } nd = Math.sqrt(nd);
    const night = this.st.time < .22 || this.st.time > .8; const aggro = d.hostile ? (night ? 42 : 26) : 0;
    if ((a.st === 'idle' || a.st === 'walk' || a.st === 'eat')) {
      if (near && d.hostile && nd < aggro) { a.st = 'chase'; a.tgt = near.id; }
      else if (near && d.flee && nd < (near.crouch ? 9 : 20)) { a.st = 'flee'; a.tm = rand(5, 8); a.h = Math.atan2(a.x - near.x, a.z - near.z) + rand(-.4, .4); }
      else if (a.tm <= 0) { const r = Math.random(); a.st = r < .45 ? 'walk' : r < .75 ? 'eat' : 'idle'; a.tm = rand(3, 9); if (a.st === 'walk') { const dh = dist2(a.x, a.z, a.home[0], a.home[1]); a.h = dh > 70 * 70 ? Math.atan2(a.home[0] - a.x, a.home[1] - a.z) : a.h + rand(-1.1, 1.1); } }
    }
    let sp = 0;
    if (a.st === 'walk') sp = d.walk; else if (a.st === 'flee') { sp = d.sp; if (a.tm <= 0) { a.st = 'idle'; a.tm = 2; } }
    else if (a.st === 'chase') {
      const t = players.find(p => p.id === a.tgt); if (!t || t.dead || t.veh || dist2(a.x, a.z, t.x, t.z) > 75 * 75) { a.st = 'idle'; a.tm = 3; a.tgt = null; }
      else { const dd = Math.hypot(t.x - a.x, t.z - a.z); a.h = Math.atan2(t.x - a.x, t.z - a.z); sp = d.sp; const fw = d.hostile ? this.fireNear(a.x, a.z, 8.5) : null; if (fw) { a.h = Math.atan2(a.x - fw.x, a.z - fw.z); sp = d.walk * 2; } else if (dd < 2.2) { sp = 0; if (a.atk <= 0) { a.atk = 1.9 + Math.random() * .8; if (!this.wallBetween(a.x, a.z, t.x, t.z) && !(d.hostile && this.fireNear(t.x, t.z, 7))) { a.st2 = 'bite'; a.bt = .5; if (Math.random() < .8) { this.damage(t, d.dmg, d.n); this.fx({ k: 'bite', x: t.x, y: t.y + 1, z: t.z }); } } } } }
    }
    if (a.bt > 0) { a.bt -= dt; if (a.bt <= 0) a.st2 = null; }
    if (sp) { const nx = a.x + Math.sin(a.h) * sp * dt, nz = a.z + Math.cos(a.h) * sp * dt, ny = w.height(nx, nz); const steep = Math.abs(ny - a.y) / (sp * dt + .001) > 1.05, wet = ny < 1.2 || w.waterLevel(nx, nz) !== null; if (wet || steep || this.solidAt(nx, nz)) { a.h += 1.6 * (Math.random() < .5 ? 1 : -1); if (a.st === 'walk') a.st = 'idle'; } else { a.x = nx; a.z = nz; a.y = ny; } }
    a.s = sp;
  }
  // walls, foundations and caves stop animals; a campfire keeps wolves away
  boxes() { if (this._w) return this._w; const out = [], W = ['wall', 'window', 'doorway', 'gable']; for (const s of this.st.structs) { if (W.includes(s.k)) { if (s.k === 'doorway' && s.open) continue; const c = Math.abs(Math.cos(s.r || 0)) > .5; out.push(c ? [s.x - 1.5, s.x + 1.5, s.z - .3, s.z + .3] : [s.x - .3, s.x + .3, s.z - 1.5, s.z + 1.5]); } else if (s.k === 'foundation') out.push([s.x - 1.5, s.x + 1.5, s.z - 1.5, s.z + 1.5]); } return this._w = out; }
  solidAt(x, z) { for (const b of this.boxes()) if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) return true; for (const c of this.world.pois.caves || []) { const d = Math.hypot(x - c.x, z - c.z); if (d < c.r + .8) return true; } return false; }
  wallBetween(ax, az, bx, bz) { const W = this.boxes(); for (const b of W) { if (b[1] - b[0] > 2.5 && b[3] - b[2] > 2.5) continue; let t0 = 0, t1 = 1, ok = true; for (const [p, q] of [[ax - bx, ax - b[0]], [bx - ax, b[1] - ax], [az - bz, az - b[2]], [bz - az, b[3] - az]]) { if (p === 0) { if (q < 0) ok = false; } else { const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); } } if (ok && t0 <= t1) return true; } return false; }
  fireNear(x, z, r) { for (const s of this.st.structs) if (s.k === 'campfire' && dist2(s.x, s.z, x, z) < r * r) return s; return null; }
  spawnRaid(p, n) { const w = this.world; let made = 0; for (let i = 0; i < n; i++) for (let t = 0; t < 20; t++) { const a = rand(0, 6.28), r = rand(34, 50), x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, h = w.height(x, z); if (h < 1.5 || w.waterLevel(x, z) !== null || this.solidAt(x, z)) continue; this.animals.push({ id: this.nextId++, sp: 'Wolf', x, z, y: h, h: 0, s: 0, st: 'chase', tm: 30, hp: ANIMALS.Wolf.hp, tgt: p.id, home: [x, z], atk: 0, raid: true }); made++; break; } return made; }
  clearRaid() { this.animals = this.animals.filter(a => !a.raid || a.st === 'dead'); }
  hitAnimal(p, id, ranged) {
    const a = this.animals.find(x => x.id === id); if (!a || a.st === 'dead') return; const it = this.equipped(p); const def = it ? ITEMS[it.id] : null; let dmg = def?.dmg || 7; if (ranged) dmg = 44; if (p.__crouch) dmg *= 1.4;
    if (dist2(a.x, a.z, p.x, p.z) > (ranged ? 150 * 150 : 6 * 6)) return; a.hp -= dmg; this.fx({ k: 'blood', x: a.x, y: a.y + ANIMALS[a.sp].h, z: a.z });
    if (!ranged) this.wearItem(p); const d = ANIMALS[a.sp];
    if (a.hp <= 0) { a.st = 'dead'; a.s = 0; a.tm = 0; for (const [i, lo, hi] of d.drop) { const n = R(lo, hi); if (n) this.spawnDrop(i, n, a.x + rand(-.7, .7), a.y, a.z + rand(-.7, .7)); } this.send(p, { t: 'toast', m: `${d.n} tumbang` }); p.stats.kills = (p.stats.kills || 0) + 1; return; }
    if (d.hostile || d.charge) { a.st = 'chase'; a.tgt = p.id; a.tm = 20; } else { a.st = 'flee'; a.tm = rand(6, 10); a.h = Math.atan2(a.x - p.x, a.z - p.z) + rand(-.3, .3); }
  }
  // ---- players
  newPlayer(key, name, look) {
    const s = this.world.pois.spawn, p = { key, name, look, x: s.x + rand(-5, 5), y: s.y + 2, z: s.z + rand(-5, 5), yaw: 0, hp: 100, food: 78, water: 72, inv: Array(SLOTS).fill(null), sel: 0, bed: null, stats: { days: 0, kills: 0 }, dead: false };
    let i = 0; for (const [id, n] of START_INV) p.inv[HOTBAR + i++] = { id, n }; return p;
  }
  join(ws, msg) {
    const key = String(msg.key || Math.random()), name = String(msg.name || 'Survivor').slice(0, 16); let p = this.st.players[key]; if (!p) p = this.st.players[key] = this.newPlayer(key, name, msg.look || {}); p.name = name; if (msg.look) p.look = msg.look;
    const c = { ws, p, id: this.nextId++, pose: [p.x, p.y, p.z, p.yaw, 0, 0, 0], car: null, carry: null }; c.pid = c.id; p.id = c.id; p.conn = c; p.veh = null; this.clients.set(ws, c); this.lastActive = Date.now();
    this.send(p, { t: 'welcome', id: c.id, code: this.dispCode || this.code, url: this.urlFn ? this.urlFn() : null, me: this.pub(p, true), st: this.full(), others: [...this.clients.values()].filter(o => o !== c).map(o => this.pub(o.p)) });
    this.broadcast({ t: 'join', p: this.pub(p) }, p); this.broadcast({ t: 'chat', sys: 1, m: `${name} bergabung` }, p); return c;
  }
  pub(p, me) { const o = { id: p.id, name: p.name, look: p.look, x: p.x, y: p.y, z: p.z, yaw: p.yaw, dead: p.dead }; if (me) Object.assign(o, { inv: p.inv, sel: p.sel, hp: p.hp, food: p.food, water: p.water, bed: p.bed, stats: p.stats }); return o; }
  full() { const s = this.st; return { time: s.time, day: s.day, rain: s.rain, dead: s.dead, hp: s.hp, drops: s.drops, structs: s.structs.map(x => this.pubStruct(x)), cars: s.cars, plane: s.plane, parts: s.parts }; }
  pubStruct(x) { const { inv, ...r } = x; return r; }
  leave(ws) {
    const c = this.clients.get(ws); if (!c) return; const p = c.p; this.dropCarried(p); this.exitCar(p); this.clients.delete(ws); p.conn = null; const i = this.st.plane.boarded.indexOf(p.key); if (i >= 0) this.st.plane.boarded.splice(i, 1);
    this.broadcast({ t: 'leave', id: c.id }); this.broadcast({ t: 'chat', sys: 1, m: `${p.name} keluar` }); this.save();
  }
  send(p, m) { const c = p.conn; if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(m)); }
  broadcast(m, except) { const s = JSON.stringify(m); for (const c of this.clients.values()) if (c.p !== except && c.ws.readyState === 1) c.ws.send(s); }
  fx(o) { this.broadcast({ t: 'fx', ...o }); }
  toast(p, m) { this.send(p, { t: 'toast', m }); }
  // ---- inventory
  count(p, id) { return p.inv.reduce((s, it) => s + (it && it.id === id ? it.n : 0), 0); }
  has(p, cost) { return Object.entries(cost).every(([k, v]) => this.count(p, k) >= v); }
  take(p, id, n) { for (let i = p.inv.length - 1; i >= 0 && n > 0; i--) { const it = p.inv[i]; if (it && it.id === id) { const m = Math.min(n, it.n); it.n -= m; n -= m; if (!it.n) p.inv[i] = null; } } }
  pay(p, cost) { for (const [k, v] of Object.entries(cost)) this.take(p, k, v); }
  give(p, id, n, inv = p.inv) {
    const st = ITEMS[id].s; for (const it of inv) { if (n > 0 && it && it.id === id && it.n < st) { const m = Math.min(n, st - it.n); it.n += m; n -= m; } }
    for (let i = 0; i < inv.length && n > 0; i++) if (!inv[i]) { const m = Math.min(n, st); const o = { id, n: m }; if (ITEMS[id].dur) o.d = ITEMS[id].dur; inv[i] = o; n -= m; }
    if (n > 0 && inv === p.inv) { this.spawnDrop(id, n, p.x, p.y, p.z); this.toast(p, 'Tas penuh, sisanya jatuh ke tanah'); } return n <= 0;
  }
  syncInv(p) { this.send(p, { t: 'inv', inv: p.inv, sel: p.sel }); }
  equipped(p) { return p.inv[p.sel] || null; }
  wearItem(p) { const it = this.equipped(p); if (it && it.d !== undefined) { it.d--; if (it.d <= 0) { p.inv[p.sel] = null; this.toast(p, `${ITEMS[it.id].n} patah!`); this.send(p, { t: 'sfx', k: 'break' }); } this.syncInv(p); } }
  spawnDrop(id, n, x, y, z) { const d = { d: this.id(), id, n, x, y: Math.max(y, this.world.height(x, z)), z }; this.st.drops.push(d); this.broadcast({ t: 'drop', d }); }
  damage(p, n, src) {
    if (p.dead) return; p.hp -= n; this.send(p, { t: 'hurt', n, src, hp: p.hp }); if (p.hp > 0) return; p.hp = 0; p.dead = true; this.dropCarried(p); this.exitCar(p);
    const bag = p.inv.filter(Boolean); for (const it of bag) { const d = { d: this.id(), id: it.id, n: it.n, x: p.x + rand(-1.4, 1.4), y: p.y, z: p.z + rand(-1.4, 1.4) }; if (it.d !== undefined) d.dur = it.d; this.st.drops.push(d); this.broadcast({ t: 'drop', d }); } p.inv = Array(SLOTS).fill(null); this.syncInv(p);
    this.broadcast({ t: 'chat', sys: 1, m: `${p.name} tewas${src ? ' (' + src + ')' : ''}` }); this.broadcast({ t: 'pdead', id: p.id, dead: 1 }); this.save();
  }
  respawn(p) { if (!p.dead) return; const b = p.bed && this.st.structs.find(s => s.id === p.bed), s = this.world.pois.spawn; p.dead = false; p.hp = 70; p.food = Math.max(p.food, 45); p.water = Math.max(p.water, 45); p.x = b ? b.x + 1.4 : s.x + rand(-5, 5); p.z = b ? b.z : s.z + rand(-5, 5); p.y = (b ? b.y : this.world.height(p.x, p.z)) + 1.6; this.send(p, { t: 'respawn', x: p.x, y: p.y, z: p.z, hp: p.hp, food: p.food, water: p.water }); this.broadcast({ t: 'pdead', id: p.id, dead: 0 }); }
  // ---- messages
  on(ws, m) {
    const c = this.clients.get(ws); if (!c) return; const p = c.p; const h = this['m_' + m.t]; if (h) h.call(this, p, m, c);
  }
  m_pose(p, m, c) { p.x = m.x; p.y = m.y; p.z = m.z; p.yaw = m.yaw; p.crouch = !!m.c; p.__crouch = !!m.c; c.pose = [m.x, m.y, m.z, m.yaw, m.pitch || 0, m.a || 0, m.it || 0]; }
  m_chat(p, m) { this.broadcast({ t: 'chat', from: p.name, m: String(m.m).slice(0, 160) }); }
  m_sel(p, m) { p.sel = Math.max(0, Math.min(HOTBAR - 1, m.i | 0)); }
  m_swap(p, m) { const a = m.a | 0, b = m.b | 0; if (a < 0 || b < 0 || a >= SLOTS || b >= SLOTS) return; const x = p.inv[a], y = p.inv[b]; if (x && y && a !== b && x.id === y.id && ITEMS[x.id].s > 1) { const n = Math.min(ITEMS[x.id].s - y.n, x.n); y.n += n; x.n -= n; if (!x.n) p.inv[a] = null; } else { p.inv[a] = y; p.inv[b] = x; } this.syncInv(p); }
  m_dropItem(p, m) { const it = p.inv[m.i | 0]; if (!it) return; const n = Math.min(m.n || it.n, it.n); const d = { d: this.id(), id: it.id, n, x: p.x + Math.sin(p.yaw) * -1.2, y: p.y, z: p.z + Math.cos(p.yaw) * -1.2 }; if (it.d !== undefined) d.dur = it.d; this.st.drops.push(d); this.broadcast({ t: 'drop', d }); it.n -= n; if (!it.n) p.inv[m.i | 0] = null; this.syncInv(p); }
  m_pick(p, m) { const i = this.st.drops.findIndex(d => d.d === m.d); if (i < 0) return; const d = this.st.drops[i]; if (dist2(d.x, d.z, p.x, p.z) > 36) return; this.st.drops.splice(i, 1); this.broadcast({ t: 'undrop', d: d.d }); this.give(p, d.id, d.n); if (d.dur !== undefined) { const it = p.inv.find(x => x && x.id === d.id && x.d === ITEMS[d.id].dur); if (it) it.d = d.dur; } this.syncInv(p); this.send(p, { t: 'got', id: d.id, n: d.n }); }
  entDead(e, sec) { this.st.dead[e.id] = Date.now() + sec * 1000 * (0.7 + Math.random() * .6); delete this.st.hp[e.id]; this.broadcast({ t: 'ent', id: e.id, dead: 1 }); }
  m_hit(p, m) { // tree/rock swing
    const e = this.world.entities[m.e]; if (!e || this.st.dead[e.id] || dist2(e.x, e.z, p.x, p.z) > 49) return; const d = entDef(e.type); if (!d || !d.hp) return; const it = this.equipped(p), def = it ? ITEMS[it.id] : null;
    const right = def && def.tool === d.tool, pow = right ? def.pow : 4; const hp = (this.st.hp[e.id] ?? d.hp) - pow; this.st.hp[e.id] = hp; if (right) this.wearItem(p); else if (Math.random() < .2) this.toast(p, d.tool === 'axe' ? 'Butuh kapak biar efektif' : 'Butuh beliung biar efektif');
    this.fx({ k: d.tool === 'axe' ? 'chip' : 'spark', x: e.x, y: e.y + 1.1, z: e.z, e: e.id, hp });
    if (right) { // small yield per swing, feels rewarding
      const [itm] = d.drop[0]; if (Math.random() < .45) { this.give(p, itm, 1); this.syncInv(p); this.send(p, { t: 'got', id: itm, n: 1 }); } }
    if (hp <= 0) { for (const [i, lo, hi] of d.drop) { const n = R(lo, hi); if (n) { this.give(p, i, n); this.send(p, { t: 'got', id: i, n }); } } this.syncInv(p); this.entDead(e, d.respawn); this.fx({ k: 'fell', x: e.x, y: e.y, z: e.z, e: e.id, tp: e.type, h: Math.atan2(e.x - p.x, e.z - p.z) }); }
  }
  m_take(p, m) {
    const e = this.world.entities[m.e]; if (!e || this.st.dead[e.id] || dist2(e.x, e.z, p.x, p.z) > 36) return; const d = entDef(e.type); if (!d || !d.take) return; const list = d.loot ? LOOT[d.loot] : d.drop; let any = 0;
    for (const [i, lo, hi] of list) { const n = R(lo, hi); if (n) { this.give(p, i, n); this.send(p, { t: 'got', id: i, n }); any = 1; } } this.syncInv(p); this.entDead(e, d.respawn); this.fx({ k: 'pick', x: e.x, y: e.y + .4, z: e.z });
  }
  m_use(p, m) { // consume
    const it = p.inv[m.i | 0]; if (!it) return; const d = ITEMS[it.id]; if (!(d.food || d.water || d.hp)) return; p.food = Math.min(100, p.food + (d.food || 0)); p.water = Math.min(100, p.water + (d.water || 0)); if (d.hp < 0) { this.damage(p, -d.hp, 'keracunan'); this.toast(p, 'Perut mulas...'); } else if (d.hp) p.hp = Math.min(100, p.hp + d.hp);
    it.n--; if (!it.n) p.inv[m.i | 0] = null; if (d.gives) { if (p.inv[m.i | 0] === null) p.inv[m.i | 0] = { id: d.gives, n: 1 }; else this.give(p, d.gives, 1); } this.syncInv(p); this.pushStats(p); this.broadcast({ t: 'pfx', id: p.id, k: d.water && !d.food ? 'drink' : 'eat' });
  }
  m_drink(p) { const lv = this.world.waterLevel(p.x, p.z), w = this.world; let ok = false; for (const [a, b] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) { const l = w.waterLevel(p.x + a, p.z + b); if (l !== null && l > .05) ok = true; } if (!ok) { this.toast(p, 'Air laut asin, cari air tawar'); return; } p.water = Math.min(100, p.water + 22); const b = p.inv.findIndex(i => i && i.id === 'bottle'); if (b >= 0) { p.inv[b] = { id: 'bottle_full', n: 1 }; this.syncInv(p); this.toast(p, 'Botol terisi'); } this.pushStats(p); this.send(p, { t: 'sfx', k: 'water' }); }
  stationNear(p, st) { return this.st.structs.some(s => s.k === st && dist2(s.x, s.z, p.x, p.z) < 36 && (st !== 'campfire' || s.fuel > 0 || true)); }
  m_craft(p, m) {
    const r = CRAFT.find(x => x.id === m.id); if (!r) return; if (r.st && !this.stationNear(p, r.st)) return this.toast(p, `Harus dekat ${BUILD[r.st].n}`); if (!this.has(p, r.cost)) return this.toast(p, 'Bahan kurang');
    this.pay(p, r.cost); this.give(p, r.out[0], r.out[1]); this.syncInv(p); this.send(p, { t: 'got', id: r.out[0], n: r.out[1] }); this.send(p, { t: 'sfx', k: 'craft' });
  }
  m_place(p, m) {
    const b = BUILD[m.k]; if (!b || !this.has(p, b.cost)) return this.toast(p, 'Bahan kurang'); if (dist2(m.x, m.z, p.x, p.z) > 225) return;
    if (['cell', 'edge', 'edge2', 'cell2', 'roof'].includes(b.kind) && this.st.structs.some(s => s.key === m.key && m.key)) return this.toast(p, 'Sudah ada bangunan di situ');
    this.pay(p, b.cost); this.syncInv(p); this._w = null; if (m.k === 'boat') { const v = { id: this.id(), kind: 'boat', x: m.x, y: m.y, z: m.z, yaw: m.r || 0, pitch: 0, roll: 0, wheels: 4, engine: 1, fuel: 100, driver: null, seats: [], cargo: null }; this.st.cars.push(v); this.broadcast({ t: 'car', v }); this.fx({ k: 'splash', x: m.x, y: m.y, z: m.z }); return; } const s = { id: this.id(), k: m.k, x: m.x, y: m.y, z: m.z, r: m.r || 0, key: m.key || null, by: p.key, hp: 100, open: 0 }; if (m.k === 'chest') s.inv = Array(CHEST_SLOTS).fill(null); if (m.k === 'rain') s.water = 0; if (m.k === 'campfire') s.fuel = 1; this.st.structs.push(s); this.broadcast({ t: 'struct', s: this.pubStruct(s) }); this.fx({ k: 'build', x: m.x, y: m.y, z: m.z });
  }
  m_door(p, m) { const s = this.st.structs.find(x => x.id === m.id); if (!s || s.k !== 'doorway') return; s.open = s.open ? 0 : 1; this._w = null; this.broadcast({ t: 'door', id: s.id, open: s.open }); }
  m_demolish(p, m) { const i = this.st.structs.findIndex(x => x.id === m.id); if (i < 0) return; const s = this.st.structs[i]; if (dist2(s.x, s.z, p.x, p.z) > 100) return; if (s.inv) for (const it of s.inv) if (it) this.spawnDrop(it.id, it.n, s.x, s.y, s.z); const b = BUILD[s.k]; for (const [k, v] of Object.entries(b.cost)) { const n = Math.floor(v / 2); if (n) this.give(p, k, n); } this.syncInv(p); this.st.structs.splice(i, 1); this._w = null; this.broadcast({ t: 'unstruct', id: s.id }); }
  m_bed(p, m) { const s = this.st.structs.find(x => x.id === m.id); if (!s) return; p.bed = s.id; this.toast(p, 'Titik respawn diatur di sini'); p.resting = true; this.broadcast({ t: 'pfx', id: p.id, k: 'rest' }); const all = [...this.clients.values()].every(c => c.p.resting); const night = this.st.time < .24 || this.st.time > .78; if (all && night) { this.st.time = .27; if (this.st.time < .5) this.st.day++; for (const c of this.clients.values()) { c.p.resting = false; c.p.hp = Math.min(100, c.p.hp + 30); this.send(c.p, { t: 'slept' }); } } else if (!night) { p.resting = false; this.toast(p, 'Tidur hanya bisa saat malam'); } else this.toast(p, 'Menunggu semua pemain tidur...'); }
  m_unrest(p) { p.resting = false; }
  m_chestOpen(p, m) { const s = this.st.structs.find(x => x.id === m.id); if (s?.inv) this.send(p, { t: 'chest', id: s.id, inv: s.inv }); }
  m_chestMove(p, m) { const s = this.st.structs.find(x => x.id === m.id); if (!s?.inv) return; const from = m.dir ? s.inv : p.inv, to = m.dir ? p.inv : s.inv, it = from[m.i | 0]; if (!it) return; const idx = to.findIndex(x => x && x.id === it.id && x.n < ITEMS[it.id].s); if (idx >= 0) { const n = Math.min(it.n, ITEMS[it.id].s - to[idx].n); to[idx].n += n; it.n -= n; if (!it.n) from[m.i | 0] = null; } else { const e = to.indexOf(null); if (e < 0) return; to[e] = it; from[m.i | 0] = null; } this.syncInv(p); const msg = { t: 'chest', id: s.id, inv: s.inv }; for (const c of this.clients.values()) this.send(c.p, msg); }
  m_rainTake(p, m) { const s = this.st.structs.find(x => x.id === m.id); if (!s || s.k !== 'rain') return; if (s.water < 1) return this.toast(p, 'Penampung masih kosong'); s.water--; p.water = Math.min(100, p.water + 30); const b = p.inv.findIndex(i => i && i.id === 'bottle'); if (b >= 0) p.inv[b] = { id: 'bottle_full', n: 1 }; this.syncInv(p); this.pushStats(p); this.send(p, { t: 'sfx', k: 'water' }); this.broadcast({ t: 'sw', id: s.id, water: s.water }); }
  m_arrow(p) { this.take(p, 'arrow', 1); this.wearItem(p); this.syncInv(p); this.broadcast({ t: 'arrow', id: p.id, o: 0 }, p); }
  m_shot(p, m) { this.broadcast({ t: 'shotfx', x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz }, p); }
  m_hitAnimal(p, m) { this.hitAnimal(p, m.id, m.r); }
  m_cheat(p, m) { if (!process.env.DEV) return; if (m.items) for (const [k, n] of Object.entries(m.items)) this.give(p, k, n); if (m.time !== undefined) this.st.time = m.time; if (m.rain !== undefined) this.st.rain = this.st.rainTarget = m.rain; if (m.parts) for (const k of Object.keys(this.st.parts)) { const v = this.st.parts[k]; v.installed = true; this.st.plane.parts[k] = true; this.partMsg(k); } if (m.fuel) { this.st.plane.fuel = 3; this.checkPlane(); } if (m.stormT !== undefined) this.st.plane.stormT = m.stormT; if (m.day !== undefined) this.st.day = m.day; if (m.raid) this.spawnRaid(p, m.raid); if (m.crop) for (const x of this.st.structs) if (x.crop) { x.crop.g = 1; this.broadcast({ t: 'crop', id: x.id, crop: x.crop }); } this.planeMsg(); this.syncInv(p); }
  m_fish(p) { const it = this.equipped(p), w = this.world; if (!it || ITEMS[it.id].tool !== 'rod') return; let ok = false; for (const [a, b] of [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5], [9, 0], [-9, 0], [0, 9], [0, -9]]) if (w.waterLevel(p.x + a, p.z + b) !== null) ok = true; if (!ok) return; const r = Math.random(), got = r < .1 ? ['scrap', 1] : r < .16 ? ['cloth', 1] : ['fish', Math.random() < .25 ? 2 : 1]; this.give(p, got[0], got[1]); this.wearItem(p); this.syncInv(p); this.send(p, { t: 'got', id: got[0], n: got[1] }); }
  m_plant(p, m) { const s = this.st.structs.find(x => x.id === m.id); if (!s || s.k !== 'plot' || s.crop) return; if (!this.has(p, { seed: 1 })) return this.toast(p, 'Butuh Benih. Cari di semak dan tanaman serat'); this.take(p, 'seed', 1); s.crop = { g: 0 }; this.syncInv(p); this.broadcast({ t: 'crop', id: s.id, crop: s.crop }); }
  m_harvest(p, m) { const s = this.st.structs.find(x => x.id === m.id); if (!s || !s.crop || s.crop.g < 1) return; const a = R(2, 4), b = R(1, 2); this.give(p, 'veg', a); this.give(p, 'seed', b); this.send(p, { t: 'got', id: 'veg', n: a }); s.crop = null; this.syncInv(p); this.broadcast({ t: 'crop', id: s.id, crop: null }); }
  m_hurt(p, m) { this.damage(p, Math.min(100, m.n | 0), m.src); }
  m_respawn(p) { this.respawn(p); }
  // ---- cars
  m_carFrame(p, m) { const gar = this.st.structs.find(s => s.k === 'garage' && dist2(s.x, s.z, p.x, p.z) < 100); if (!gar) return this.toast(p, 'Harus dekat Bengkel'); if (!this.has(p, CAR_FRAME_COST)) return this.toast(p, 'Bahan rangka kurang'); this.pay(p, CAR_FRAME_COST); this.syncInv(p); const x = gar.x + Math.cos(gar.r) * 5.5, z = gar.z - Math.sin(gar.r) * 5.5; const v = { id: this.id(), x, y: this.world.height(x, z) + .9, z, yaw: gar.r, pitch: 0, roll: 0, wheels: 0, engine: 0, fuel: 0, driver: null, seats: [], cargo: null }; this.st.cars.push(v); this.broadcast({ t: 'car', v }); this.toast(p, 'Rangka mobil selesai! Tambah roda dan mesin'); }
  m_carAdd(p, m) { const v = this.st.cars.find(c => c.id === m.id); if (!v || dist2(v.x, v.z, p.x, p.z) > 64) return; if (m.k === 'wheel') { if (v.wheels >= 4 || !this.has(p, { wheel: 1 })) return this.toast(p, 'Butuh Roda'); this.take(p, 'wheel', 1); v.wheels++; } else if (m.k === 'engine') { if (v.engine || !this.has(p, { carengine: 1 })) return this.toast(p, 'Butuh Mesin Mobil'); this.take(p, 'carengine', 1); v.engine = 1; } else if (m.k === 'fuel') { if (!this.has(p, { fuel: 1 })) return this.toast(p, 'Butuh Jerigen Bensin'); this.take(p, 'fuel', 1); v.fuel = Math.min(100, v.fuel + 50); } this.syncInv(p); this.broadcast({ t: 'car', v }); this.send(p, { t: 'sfx', k: 'craft' }); }
  m_carEnter(p, m) { const v = this.st.cars.find(c => c.id === m.id); if (!v || p.veh || dist2(v.x, v.z, p.x, p.z) > 49) return; if (v.wheels < 4) return this.toast(p, 'Roda belum lengkap'); if (!v.driver && !m.seat) { v.driver = p.id; p.veh = v.id; } else if (v.seats.length < 3) { v.seats.push(p.id); p.veh = v.id; } else return; this.broadcast({ t: 'car', v }); this.broadcast({ t: 'pveh', id: p.id, veh: v.id, driver: v.driver === p.id }); }
  exitCar(p) { if (!p.veh) return; const v = this.st.cars.find(c => c.id === p.veh); p.veh = null; if (v) { if (v.driver === p.id) v.driver = null; v.seats = v.seats.filter(i => i !== p.id); this.broadcast({ t: 'car', v }); } this.broadcast({ t: 'pveh', id: p.id, veh: null }); }
  m_carExit(p) { this.exitCar(p); }
  m_carPose(p, m) { const v = this.st.cars.find(c => c.id === m.id); if (!v || v.driver !== p.id) return; Object.assign(v, { x: m.x, y: m.y, z: m.z, yaw: m.yaw, pitch: m.pitch, roll: m.roll, sp: m.sp }); if (m.burn && v.fuel > 0) v.fuel = Math.max(0, v.fuel - m.burn); }
  // ---- plane parts
  partMsg(k) { this.broadcast({ t: 'part', k, v: this.st.parts[k] }); }
  dropCarried(p) { for (const [k, v] of Object.entries(this.st.parts)) if (v.carrier === p.key) { v.carrier = null; v.x = p.x; v.y = this.world.height(p.x, p.z); v.z = p.z; this.partMsg(k); } }
  m_partPick(p, m) { const v = this.st.parts[m.k]; if (!v || v.installed || v.carrier || dist2(v.x, v.z, p.x, p.z) > 36) return; if (Object.values(this.st.parts).some(x => x.carrier === p.key)) return; if (v.car) { const c = this.st.cars.find(x => x.id === v.car); if (c) { c.cargo = null; this.broadcast({ t: 'car', v: c }); } v.car = null; } v.carrier = p.key; if (!v.found) { v.found = true; this.broadcast({ t: 'chat', sys: 1, m: `${p.name} menemukan ${PART_INFO[m.k].n}!` }); } this.partMsg(m.k); }
  m_partDrop(p) { this.dropCarried(p); }
  m_partLoad(p, m) { const c = this.st.cars.find(x => x.id === m.id); if (!c || c.cargo) return this.toast(p, 'Bak mobil sudah terisi'); const e = Object.entries(this.st.parts).find(([, v]) => v.carrier === p.key); if (!e) return; const [k, v] = e; v.carrier = null; v.car = c.id; c.cargo = k; this.partMsg(k); this.broadcast({ t: 'car', v: c }); }
  m_partInstall(p, m) { const v = this.st.parts[m.k], info = PART_INFO[m.k]; if (!v || v.installed) return; const cr = this.world.pois.crash; if (dist2(v.x, v.z, cr.x, cr.z) > 900 && dist2(p.x, p.z, cr.x, cr.z) > 900) return this.toast(p, 'Bawa dulu ke bangkai pesawat'); if (!this.has(p, info.cost)) return this.toast(p, 'Bahan perbaikan kurang'); this.pay(p, info.cost); this.syncInv(p); v.installed = true; v.carrier = null; if (v.car) { const c = this.st.cars.find(x => x.id === v.car); if (c) { c.cargo = null; this.broadcast({ t: 'car', v: c }); } v.car = null; } this.st.plane.parts[m.k] = true; this.partMsg(m.k); this.planeMsg(); this.broadcast({ t: 'chat', sys: 1, m: `${info.n} terpasang (${Object.keys(this.st.plane.parts).length}/6)` }); this.fx({ k: 'install', x: cr.x, y: cr.y + 3, z: cr.z }); this.checkPlane(); }
  m_planeFuel(p) { if (this.st.plane.fuel >= PLANE_FUEL) return; if (!this.has(p, { fuel: 1 })) return this.toast(p, 'Butuh Jerigen Bensin'); this.take(p, 'fuel', 1); this.syncInv(p); this.st.plane.fuel++; this.planeMsg(); this.checkPlane(); }
  checkPlane() { const pl = this.st.plane; if (Object.keys(pl.parts).length >= 6 && pl.fuel >= PLANE_FUEL && pl.phase === 'wreck') { pl.phase = 'storm'; pl.stormT = STORM_SEC; this.stormW = 8; this.stormB = 5; this.planeMsg(); this.broadcast({ t: 'chat', sys: 1, m: 'Badai datang! Pesawat baru bisa terbang setelah badai reda.' }); this.broadcast({ t: 'raid', storm: 1 }); } }
  planeMsg() { this.broadcast({ t: 'plane', v: this.st.plane }); }
  m_planeBoard(p) { const pl = this.st.plane; if (pl.phase !== 'ready') return; if (!pl.boarded.includes(p.key)) pl.boarded.push(p.key); this.planeMsg(); }
  m_planeLeave(p) { const pl = this.st.plane, i = pl.boarded.indexOf(p.key); if (i >= 0) pl.boarded.splice(i, 1); this.planeMsg(); }
  m_planeGo(p) { const pl = this.st.plane; if (pl.phase !== 'ready') return; const on = [...this.clients.values()].filter(c => pl.boarded.includes(c.p.key)); if (!pl.boarded.includes(p.key)) return; if (on.length < this.clients.size) return this.toast(p, `Tunggu semua naik (${on.length}/${this.clients.size})`); pl.phase = 'takeoff'; this.planeMsg(); const tot = Object.values(this.st.players).reduce((s, x) => s + (x.stats.kills || 0), 0); setTimeout(() => { pl.phase = 'done'; this.broadcast({ t: 'ending', day: this.st.day, kills: tot, names: [...this.clients.values()].map(c => c.p.name) }); this.planeMsg(); this.save(); }, 26000); }
  // ---- step
  pushStats(p) { this.send(p, { t: 'stats', hp: p.hp, food: p.food, water: p.water }); }
  step(dt) {
    const s = this.st; this.tick++; s.time += dt / STAT.dayLen; if (s.time >= 1) { s.time -= 1; s.day++; this.broadcast({ t: 'chat', sys: 1, m: `Hari ke-${s.day}` }); }
    // weather
    s.rainNext -= dt; if (s.rainNext <= 0) { s.rainTarget = s.rainTarget > 0 ? 0 : (Math.random() < .55 ? rand(.5, 1) : 0); s.rainNext = rand(180, 500); } s.rain += Math.sign(s.rainTarget - s.rain) * Math.min(Math.abs(s.rainTarget - s.rain), dt * .025); if (s.rain > .3 && this.tick % 200 === 0) for (const x of s.structs) if (x.k === 'rain' && x.water < 4) { x.water++; this.broadcast({ t: 'sw', id: x.id, water: x.water }); }
    const players = [...this.clients.values()].map(c => c.p); const live = players.filter(p => !p.dead), pl = s.plane, pick = () => live[R(0, live.length - 1)];
    if (live.length && s.day >= 2 && s.time > .84 && s.time < .95 && s.raidDay !== s.day && pl.phase === 'wreck') { s.raidDay = s.day; const n = this.spawnRaid(pick(), Math.min(1 + s.day, 6)); if (n) this.broadcast({ t: 'raid', n }); }
    if (this.tick % 40 === 0 && s.time > .24 && s.time < .4 && pl.phase !== 'storm') this.clearRaid();
    if (pl.phase === 'storm' && live.length) {
      pl.stormT -= dt; s.rain = 1; s.rainTarget = 1; s.rainNext = 90; this.stormW = (this.stormW ?? 8) - dt; this.stormB = (this.stormB ?? 5) - dt;
      if (this.stormW <= 0) { this.stormW = 38; if (this.spawnRaid(pick(), 1 + live.length)) this.broadcast({ t: 'raid', n: 1 }); }
      if (this.stormB <= 0) { this.stormB = rand(4.5, 8.5); const t = pick(), a = rand(0, 6.28), r = rand(3, 20), x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; this.broadcast({ t: 'bolt', x, z, warn: 1 }); setTimeout(() => { this.broadcast({ t: 'bolt', x, z }); for (const c of this.clients.values()) if (!c.p.dead && dist2(c.p.x, c.p.z, x, z) < 25) this.damage(c.p, 16, 'petir'); }, 1300); }
      if (pl.stormT <= 0) { pl.phase = 'ready'; s.rainTarget = 0; s.rainNext = 400; this.clearRaid(); this.planeMsg(); this.broadcast({ t: 'chat', sys: 1, m: 'Badai reda. Pesawat siap, semua naik!' }); }
    }
    if (players.length) for (const a of this.animals) { let close = false; for (const p of live) if (dist2(a.x, a.z, p.x, p.z) < 260 * 260) { close = true; break; } if (close || this.tick % 10 === 0) this.stepAnimal(a, close ? dt : dt * 10, live); }
    if (this.tick % 10 === 0) {
      const sdt = dt * 10; for (const p of live) {
        const moving = 1; p.food -= sdt * 100 / STAT.hungerSec; p.water -= sdt * 100 / STAT.thirstSec; if (p.food <= 0) { p.food = 0; this.damage(p, STAT.starveDmg * sdt, 'kelaparan'); } if (p.water <= 0) { p.water = 0; this.damage(p, STAT.starveDmg * 1.3 * sdt, 'kehausan'); } if (p.food > 55 && p.water > 55 && p.hp < 100) p.hp = Math.min(100, p.hp + .22 * sdt); this.pushStats(p);
        s.day > (p.stats.days || 0) && (p.stats.days = s.day);
      }
      for (const x of s.structs) if (x.crop && x.crop.g < 1) { const st0 = Math.floor(x.crop.g * 3); x.crop.g = Math.min(1, x.crop.g + sdt / GROW_SEC * (s.rain > .3 ? 1.6 : 1)); if (Math.floor(x.crop.g * 3) !== st0) this.broadcast({ t: 'crop', id: x.id, crop: x.crop }); }
      const now = Date.now(); for (const id in s.dead) if (s.dead[id] < now) { let blocked = false; const e = this.world.entities[id]; for (const p of live) if (e && dist2(e.x, e.z, p.x, p.z) < 900) blocked = true; if (blocked) { s.dead[id] += 60000; continue; } delete s.dead[id]; this.broadcast({ t: 'ent', id: +id, dead: 0 }); }
      if (s.drops.length > 400) { const d = s.drops.shift(); this.broadcast({ t: 'undrop', d: d.d }); }
    }
    if (this.tick % 3 === 0 && this.clients.size) { // 6.6 Hz animals, cars, players
      const plist = [...this.clients.values()].map(c => [c.id, ...c.pose]); const cars = s.cars.filter(c => c.driver).map(c => [c.id, c.x, c.y, c.z, c.yaw, c.pitch, c.roll, c.fuel | 0, c.sp || 0]);
      for (const c of this.clients.values()) { const p = c.p, an = []; for (const a of this.animals) if (dist2(a.x, a.z, p.x, p.z) < 230 * 230) an.push([a.id, a.sp, +a.x.toFixed(2), +a.y.toFixed(2), +a.z.toFixed(2), +a.h.toFixed(2), a.st, a.s, a.st2 || 0]); if (c.ws.readyState === 1) c.ws.send(JSON.stringify({ t: 's', p: plist, a: an, c: cars, tm: +s.time.toFixed(5), day: s.day, r: +s.rain.toFixed(3), sT: pl.phase === 'storm' ? Math.ceil(pl.stormT) : 0 })); }
    }
    if (this.tick % 600 === 0) this.save();
  }
}
