// ===== Simulasi host (otoritatif) =====
import {
  DAY_START, DAY_END, MPS, ITEMS, IKEYS, TIERS, UPG, LVXP, MAXLV, CTYPES, STATIONS, SLOTS, QUEUE, LANE_Z,
  DROP, METER, HOUSES, doorOf, priceOf, capOf, carryCap, isUnlocked, inWarung, dist, rp, rpShort,
} from './data.js';

const R = Math.random;
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Misi cerita ----------
export const STORY = [
  { ti: 'Warung Warisan', de: 'Warung Mbah Sarni udah lama tutup dan berdebu. Sapu 6 kotoran di dalam warung.', key: 'dirt', g: 6, rw: 50000,
    on: S => spawnDirt(S, 6, true) },
  { ti: 'Buka Warung!', de: 'Pembeli mulai datang. Ambil barang dari rak, terus kasih ke pembeli di meja depan. Layani 5 pembeli.', key: 'served', g: 5, rw: 50000 },
  { ti: 'Rak Mulai Kosong', de: 'Buka HP › Belanja, pesen kardus. Kurir naruh kardus di samping kiri warung, angkat terus isi ke rak yang cocok (2 kardus).', key: 'boxes', g: 2, rw: 60000 },
  { ti: 'Makin Dikenal', de: 'Terus layani pembeli sampai warung naik ke Level 2.', fn: S => [Math.min(S.lv, 2), 2], rw: 75000 },
  { ti: 'Titipan Bu RT', de: 'Bu RT nitip belanjaan. Terima pesanannya di HP › Antar, bawa barangnya ke rumah Bu RT (kiri warung).', key: 'deliv', g: 1, rw: 100000,
    on: S => spawnJob(S, 'rt', true) },
  { ti: 'Gerah Banget', de: 'Pembeli pada kepanasan. Beli Kipas Angin di HP › Upgrade.', fn: S => [S.up.kipas ? 1 : 0, 1], rw: 50000 },
  { ti: 'Awas Maling!', de: 'Katanya ada maling yang ngincer warung. Tangkep 1 maling sebelum dia kabur (tabrak aja orangnya).', key: 'thief', g: 1, rw: 100000,
    on: S => { S.ev.thief = 5; } },
  { ti: 'Musim Hujan', de: 'Hujan deras dan atap bocor! Pasang ember di 2 titik bocor sebelum barang basah.', key: 'leaks', g: 2, rw: 80000,
    on: S => { startRain(S, 140); S.ev.leak = 3; } },
  { ti: 'Saingan Seberang', de: 'MegaMart buka di seberang jalan. Buktiin warung kalian masih juara: omzet Rp 700rb dalam 1 hari.', fn: S => [Math.min(S.ds.rev, 700000), 700000], rw: 150000, money: true },
  { ti: 'Gelap Gulita', de: 'Listrik desa sering padam. Kalau mati lampu, benerin di meteran samping kanan warung.', key: 'power', g: 1, rw: 80000,
    on: S => { S.ev.power = 6; } },
  { ti: 'Hajatan Pak Lurah', de: 'Pak Lurah mau hajatan dan butuh banyak barang. Selesaikan 3 antaran.', key: 'deliv', g: 3, rw: 250000,
    on: S => spawnJob(S, 'lurah', true) },
  { ti: 'Pelayanan Prima', de: 'Biar warga setia, capai rating bintang 4,5.', fn: S => [Math.min(S.rating, 4.5), 4.5], rw: 200000, rating: true },
  { ti: 'Adu Laris', de: 'Kalahin MegaMart: layani 45 pembeli dalam 1 hari.', fn: S => [Math.min(S.ds.served, 45), 45], rw: 300000 },
  { ti: 'Warung Kompak Jaya', de: 'Kumpulin Rp 5.000.000 di Celengan Renovasi (HP › Celengan) biar warung jadi toko kelontong.', fn: S => [Math.min(S.cel, 5e6), 5e6], rw: 0, money: true, final: true },
];

// ---------- Misi harian ----------
function genDaily(S) {
  const lv = S.lv, unl = IKEYS.filter(k => isUnlocked(k, lv, S.up) && k !== 'gas');
  const pool = [
    () => { const g = 10 + lv * 3; return { ty: 'served', ti: `Layani ${g} pembeli`, g }; },
    () => { const k = pick(unl); const g = 8 + lv * 2; return { ty: 'sold', k, ti: `Jual ${g} ${ITEMS[k].n}`, g }; },
    () => { const g = (200 + lv * 80) * 1000; return { ty: 'rev', ti: `Omzet ${rpShort(g)}`, g, money: true }; },
    () => ({ ty: 'nolost', ti: 'Maksimal 2 pembeli kabur', g: 2, end: true }),
    () => { const g = 4 + Math.floor(lv / 2); return { ty: 'fast', ti: `Layani ${g} pembeli dengan cepat`, g }; },
    () => { const g = 2 + Math.floor(lv / 3); return { ty: 'boxes', ti: `Isi rak ${g} kardus`, g }; },
    () => ({ ty: 'dirt', ti: 'Sapu 5 kotoran', g: 5 }),
    () => { const g = 7 + lv; return { ty: 'streak', ti: `Combo ${g} pembeli tanpa ada yang kabur`, g }; },
    () => ({ ty: 'kids', ti: 'Layani 4 anak sekolah', g: 4 }),
    () => ({ ty: 'ojol', ti: 'Layani 4 driver ojol', g: 4 }),
  ];
  if (lv >= 3 || S.story.i > 4) pool.push(() => { const g = 1 + Math.floor(lv / 4); return { ty: 'deliv', ti: `Selesaikan ${g} antaran`, g }; });
  if (S.day >= 2) pool.push(() => ({ ty: 'rats', ti: 'Usir 3 tikus', g: 3 }));
  const out = [], used = new Set();
  let guard = 0;
  while (out.length < 3 && guard++ < 50) {
    const m = pick(pool)();
    if (used.has(m.ty) || ((m.ty === 'rats' || m.ty === 'kids' || m.ty === 'ojol') && R() < 0.4)) continue;
    used.add(m.ty);
    m.rw = Math.round((30 + lv * 12 + R() * 30) / 5) * 5000;
    m.xp = 20 + lv * 4;
    m.c = 0; m.ok = false;
    out.push(m);
  }
  return out;
}
function dailyProg(S, m) {
  const d = S.ds;
  switch (m.ty) {
    case 'served': return d.served;
    case 'sold': return d.sold[m.k] || 0;
    case 'rev': return d.rev;
    case 'nolost': return d.lost;
    case 'fast': return d.fast;
    case 'boxes': return d.boxes;
    case 'dirt': return d.dirt;
    case 'streak': return d.maxStreak;
    case 'kids': return d.kids;
    case 'ojol': return d.ojol;
    case 'deliv': return d.deliv;
    case 'rats': return d.rats;
  }
  return 0;
}

// ---------- State ----------
function freshDay() {
  return { served: 0, lost: 0, rev: 0, spent: 0, sold: {}, fast: 0, boxes: 0, deliv: 0, thief: 0, rats: 0, dirt: 0, leaks: 0, power: 0, kids: 0, ojol: 0, streak: 0, maxStreak: 0 };
}
export function newState(save) {
  const S = {
    nid: 1, day: 1, tm: DAY_START, ph: 'open', money: 150000, cel: 0, rating: 3.5, xp: 0, lv: 1,
    power: true, powerT: 0, spoiled: false, rainT: 0, rainDay: false, promo: false, won: false,
    stock: { mie: 8, snack: 8, kopi: 10, air: 6, telur: 0, beras: 0, sabun: 0, teh: 0, gas: 0, eskrim: 0 },
    price: Object.fromEntries(IKEYS.map(k => [k, 1])),
    up: {}, orders: [], pl: {}, cu: [], bx: [], dt: [], lk: [], rt: [], th: [], jobs: [],
    cour: -1, courLoad: [], courDropped: false,
    tot: { served: 0, lost: 0, rev: 0, dirt: 0, boxes: 0, deliv: 0, thief: 0, rats: 0, leaks: 0, power: 0, fast: 0 },
    ds: freshDay(), story: { i: 0, base: {} }, daily: [],
    spawnT: 6, ev: { thief: 999, rat: 999, power: 999, leak: 999, dirt: 40, job: 45 }, sum: null, helped: false,
  };
  if (save) {
    for (const k of ['day', 'money', 'cel', 'rating', 'xp', 'lv', 'stock', 'price', 'up', 'tot', 'story', 'won', 'unl']) if (save[k] !== undefined) S[k] = save[k];
    S.stock = Object.assign(Object.fromEntries(IKEYS.map(k => [k, 0])), S.stock);
    S.price = Object.assign(Object.fromEntries(IKEYS.map(k => [k, 1])), S.price);
    S.tot = Object.assign(newState().tot, S.tot || {});
    S.day = (S.day || 1) - 1;
    startDay(S, () => {});
    const cur = STORY[S.story.i];
    if (cur && cur.on && S.story.i > 0) cur.on(S);
    return S;
  }
  S.daily = genDaily(S);
  S.story.base = { ...S.tot };
  STORY[0].on(S);
  return S;
}
export function saveData(S) {
  const { day, money, cel, rating, xp, lv, stock, price, up, tot, story, won, unl } = S;
  return { v: 1, day, money, cel, rating, xp, lv, stock, price, up, tot, story, won, unl, at: Date.now() };
}

// ---------- Pemain ----------
export function addPlayer(S, id, n, c) {
  const idx = Object.keys(S.pl).length;
  S.pl[id] = { id, n: String(n || 'Pemain').slice(0, 12), c: c | 0, x: -1.5 + idx * 1.2, z: -1, r: 0, m: 0, ca: [], bx: null };
  return S.pl[id];
}
export function removePlayer(S, id) {
  const p = S.pl[id];
  if (!p) return;
  for (const k of p.ca) S.stock[k] = (S.stock[k] || 0) + 1;
  if (p.bx) S.bx.push({ id: S.nid++, k: p.bx, x: clamp(p.x, -9.5, 9.5), z: p.z });
  delete S.pl[id];
}
export function setPlayerPos(S, id, x, z, r, m) {
  const p = S.pl[id];
  if (!p || !isFinite(x) || !isFinite(z)) return;
  p.x = x; p.z = z; p.r = r; p.m = m ? 1 : 0;
}

// ---------- Spawner ----------
function spawnDirt(S, n, inside) {
  for (let i = 0; i < n; i++) {
    const p = inside || R() < 0.5 ? { x: -5 + R() * 10, z: -2.9 + R() * 3.6 } : { x: -5 + R() * 10, z: 2.7 + R() * 2.4 };
    S.dt.push({ id: S.nid++, x: p.x, z: p.z });
  }
}
function startRain(S, sec) { S.rainT = Math.max(S.rainT, sec); }
function spawnJob(S, house, forced) {
  const unl = IKEYS.filter(k => isUnlocked(k, S.lv, S.up));
  const cap = carryCap(S.up);
  const n = forced && house === 'lurah' ? cap : 2 + Math.floor(R() * (cap - 2));
  const it = {};
  const kinds = Math.min(unl.length, 1 + Math.floor(R() * 3));
  const ks = [...unl].sort(() => R() - 0.5).slice(0, kinds);
  for (let i = 0; i < n; i++) { const k = ks[i % ks.length]; it[k] = (it[k] || 0) + 1; }
  const h = house || pick(Object.keys(HOUSES));
  let val = 0; for (const k in it) val += priceOf(k, S.price[k]) * it[k];
  const far = dist(doorOf(h), { x: 0, z: 3 });
  const rw = val + Math.round((10 + far * 0.8) / 5) * 5000 + (h === 'lurah' ? 30000 : 0);
  S.jobs.push({ id: S.nid++, h, it: Object.entries(it), rw, t: forced ? 9999 : 55, acc: false, forced: !!forced });
}
function genOrder(S, ty) {
  const T = CTYPES[ty];
  let pool = T.pool.filter(k => isUnlocked(k, S.lv, S.up));
  if (!pool.length) pool = IKEYS.filter(k => isUnlocked(k, S.lv, S.up));
  const maxQ = Math.min(carryCap(S.up), 2 + Math.floor(S.lv / 2) + (ty === 'pakrt' ? 1 : 0));
  let kinds = 1 + Math.floor(R() * Math.min(T.maxK, pool.length));
  const inS = pool.filter(k => S.stock[k] > 0);
  const base = inS.length && R() < 0.85 ? inS : pool;
  const ks = [...base].sort(() => R() - 0.5).slice(0, Math.min(kinds, base.length));
  let total = Math.max(kinds, Math.min(maxQ, kinds + Math.floor(R() * (maxQ - kinds + 1))));
  if (ty === 'anak' || ty === 'ojol') total = Math.min(total, 2);
  if (ty === 'pakrt') total = maxQ;
  kinds = ks.length;
  total = Math.max(total, kinds);
  const o = {};
  for (let i = 0; i < total; i++) { const k = ks[i % ks.length]; o[k] = (o[k] || 0) + 1; }
  return Object.entries(o);
}
function spawnCustomer(S) {
  const freeSlot = SLOTS.findIndex((_, i) => !S.cu.some(c => c.sl === i && c.st !== 'leave'));
  const qUsed = S.cu.filter(c => c.q >= 0 && c.st !== 'leave').length;
  if (freeSlot < 0 && qUsed >= QUEUE.length) return;
  const h = S.tm / 60;
  let ty;
  const r = R();
  if (h >= 12 && h < 14.5 && r < 0.45) ty = 'anak';
  else if (h < 9 && r < 0.35) ty = 'ojol';
  else if (S.day >= 2 && r < 0.1) ty = 'rewel';
  else if (S.lv >= 3 && r < 0.16) ty = 'pakrt';
  else ty = pick(['ibu', 'ibu', 'bapak', 'bapak', 'anak', 'ojol']);
  const T = CTYPES[ty];
  const side = R() < 0.5 ? -1 : 1;
  const c = {
    id: S.nid++, ty, look: Math.floor(R() * 9999), x: side * (20 + R() * 4), z: LANE_Z + (R() - 0.5) * 0.6, r: 0, m: 1,
    st: 'walk', sl: -1, q: -1, path: [], ord: genOrder(S, ty), rem: null, sp: T.sp * (0.9 + R() * 0.2),
    pat: 0, patMax: 0, swapped: false, paidPart: 0,
  };
  c.rem = c.ord.map(([k, q]) => [k, q]);
  let mult = 1;
  if (S.up.kipas) mult *= 1.15;
  if (S.up.radio) mult *= 1.1;
  if (S.up.qris) mult *= 1.1;
  const avgTier = c.ord.reduce((a, [k]) => a + S.price[k], 0) / c.ord.length;
  if (avgTier < 0.8) mult *= 1.15; else if (avgTier > 1.5) mult *= 0.82;
  c.patMax = c.pat = T.pat * mult;
  if (freeSlot >= 0) { c.sl = freeSlot; c.path = [{ x: SLOTS[freeSlot].x, z: LANE_Z }, SLOTS[freeSlot]]; }
  else { const qi = QUEUE.findIndex((_, i) => !S.cu.some(x => x.q === i && x.st !== 'leave')); c.q = qi; c.path = [{ x: QUEUE[qi].x, z: LANE_Z }, QUEUE[qi]]; }
  S.cu.push(c);
}
function leave(S, c) {
  if (c.st === 'leave') return;
  c.st = 'leave';
  const side = c.x < 0 ? -1 : 1;
  c.path = [{ x: c.x, z: LANE_Z }, { x: side * 34, z: LANE_Z + (R() - 0.5) }];
  c.sl = -1; c.q = -1;
}
function spawnThief(S, emit) {
  const st = Object.keys(STATIONS).filter(k => k !== 'gas' && isUnlocked(k, S.lv, S.up) && S.stock[k] > 0);
  if (!st.length) return;
  const k = pick(st), s = R() < 0.5 ? -1 : 1, P = STATIONS[k];
  const t = { id: S.nid++, x: s * 26, z: LANE_Z + 0.4, r: 0, m: 1, st: 'come', k, s, t: 0, loot: 0, seen: false,
    path: [{ x: s * 9, z: LANE_Z }, { x: s * 7.6, z: -0.8 }, { x: s * 5.0, z: -0.8 }, { x: P.x, z: P.z }] };
  S.th.push(t);
  if (S.up.cctv) { t.seen = true; emit({ f: 'toast', s: 'CCTV: ada maling mau masuk warung!', k: 'bad' }); emit({ f: 'sfx', s: 'alarm' }); }
}
function spawnRats(S, emit) {
  const st = ['mie', 'snack', 'kopi', 'beras', 'sabun'].filter(k => isUnlocked(k, S.lv, S.up) && S.stock[k] > 0);
  if (!st.length) return;
  const n = 1 + Math.floor(R() * Math.min(3, S.day));
  for (let i = 0; i < n; i++) {
    const k = pick(st), P = STATIONS[k];
    S.rt.push({ id: S.nid++, k, x: P.x + (R() - 0.5) * 1.4, z: P.z + 0.3 + R() * 0.6, t: 5, life: 70, ang: R() * 6.28 });
  }
  emit({ f: 'toast', s: 'Ada tikus di rak! Usir sebelum stok dimakan', k: 'bad' });
  emit({ f: 'sfx', s: 'squeak' });
}
function cutPower(S, emit) {
  if (!S.power) return;
  S.power = false; S.powerT = 0; S.spoiled = false;
  emit({ f: 'toast', s: 'Mati lampu! Benerin di meteran samping kanan warung', k: 'bad' });
  emit({ f: 'sfx', s: 'down' });
}

// ---------- Hari ----------
function startDay(S, emit) {
  S.day++; S.tm = DAY_START; S.ph = 'open'; S.sum = null;
  S.ds = freshDay();
  S.daily = genDaily(S);
  S.cu = []; S.th = []; S.rt = []; S.lk = []; S.jobs = S.jobs.filter(j => j.forced);
  S.power = true; S.rainT = 0;
  S.rainDay = S.day >= 2 && R() < 0.32;
  S.promo = (S.day >= 3 && R() < 0.33) || S.story.i === 8;
  S.spawnT = 5;
  const late = S.story.i >= 6 || S.day >= 3;
  S.ev.thief = late ? 60 + R() * 120 : 999;
  S.ev.rat = S.day >= 2 ? 50 + R() * 90 : 999;
  S.ev.power = S.story.i >= 9 || S.day >= 4 ? 120 + R() * 200 : 999;
  S.ev.leak = 20; S.ev.dirt = 40; S.ev.job = 30;
  const stk = IKEYS.reduce((a, k) => a + (S.stock[k] || 0), 0);
  if (S.money < 40000 && stk < 10) { S.money += 75000; emit({ f: 'toast', s: 'Mbah Sarni ngirim modal darurat Rp 75.000. Pakai buat belanja stok ya', k: 'ok' }); }
  emit({ f: 'toast', s: `Hari ke-${S.day} dimulai. Warung buka!`, k: 'info' });
  if (S.promo) emit({ f: 'toast', s: 'MegaMart lagi promo besar. Pembeli bakal lebih sepi, jaga rating!', k: 'warn' });
  if (S.rainDay) emit({ f: 'toast', s: 'Ramalan cuaca: hari ini bakal hujan', k: 'info' });
  // simpan baseline misi cerita bertipe harian biar adil
}
function endDay(S, emit) {
  S.ph = 'sum';
  for (const c of S.cu) leave(S, c);
  S.th = []; S.rt = []; S.lk = []; S.rainT = 0; S.power = true;
  S.jobs = S.jobs.filter(j => j.forced);
  const rent = Math.min(30000 + 10000 * S.lv, Math.max(0, S.money));
  S.money -= rent;
  let bonus = 0;
  for (const m of S.daily) {
    if (m.end && !m.ok && S.ds.lost <= m.g) { m.ok = true; S.money += m.rw; S.xp += m.xp; bonus += m.rw; }
  }
  S.sum = {
    day: S.day, rev: S.ds.rev, spent: S.ds.spent, rent, bonus, profit: S.ds.rev - S.ds.spent - rent + bonus,
    served: S.ds.served, lost: S.ds.lost, rating: S.rating, done: S.daily.filter(m => m.ok).length,
  };
  checkLevel(S, emit);
  emit({ f: 'toast', s: 'Jam 21.00, warung tutup. Lihat ringkasan hari ini', k: 'info' });
  emit({ f: 'sfx', s: 'lvl' });
  emit({ f: 'save' });
}

function checkUnlocks(S, emit) {
  if (!S.unl) S.unl = IKEYS.filter(k => isUnlocked(k, S.lv, S.up));
  for (const k of IKEYS) {
    if (S.unl.includes(k) || !isUnlocked(k, S.lv, S.up)) continue;
    S.unl.push(k);
    if (S.stock[k] < 4) S.stock[k] = Math.ceil(capOf(k, S.up) / 2);
    emit({ f: 'toast', s: `Barang baru: ${ITEMS[k].i} ${ITEMS[k].n}. Supplier ngasih stok awal gratis!`, k: 'ok' });
  }
}
function checkLevel(S, emit) {
  let lv = 1;
  for (let i = 0; i < MAXLV; i++) if (S.xp >= LVXP[i]) lv = i + 1;
  if (lv > S.lv) {
    S.lv = lv;
    const unl = IKEYS.filter(k => ITEMS[k].lv === lv).map(k => ITEMS[k].n);
    const ups = Object.keys(UPG).filter(k => UPG[k].lv === lv).map(k => UPG[k].n);
    const extra = [...unl, ...ups];
    emit({ f: 'toast', s: `Warung naik ke Level ${lv}!` + (extra.length ? ' Kebuka: ' + extra.join(', ') : ''), k: 'ok', big: true });
    emit({ f: 'sfx', s: 'lvl' });
  }
  checkUnlocks(S, emit);
}
function storyProg(S) {
  const m = STORY[S.story.i];
  if (!m) return [0, 0];
  if (m.fn) return m.fn(S);
  return [Math.min((S.tot[m.key] || 0) - (S.story.base[m.key] || 0), m.g), m.g];
}
function checkMissions(S, emit) {
  const m = STORY[S.story.i];
  if (m) {
    const [c, g] = storyProg(S);
    if (c >= g) {
      S.money += m.rw; S.xp += 25;
      emit({ f: 'toast', s: `Misi selesai: ${m.ti}` + (m.rw ? ` (+${rp(m.rw)})` : ''), k: 'ok', big: true });
      emit({ f: 'sfx', s: 'ok' });
      if (m.final) { S.won = true; emit({ f: 'win' }); }
      S.story.i++;
      S.story.base = { ...S.tot };
      const n = STORY[S.story.i];
      if (n && n.on) n.on(S);
      emit({ f: 'save' });
    }
  }
  for (const d of S.daily) {
    if (d.ok || d.end) continue;
    if (dailyProg(S, d) >= d.g) {
      d.ok = true; S.money += d.rw; S.xp += d.xp;
      emit({ f: 'toast', s: `Misi harian beres: ${d.ti} (+${rp(d.rw)})`, k: 'ok' });
      emit({ f: 'sfx', s: 'ok' });
    }
  }
  checkLevel(S, emit);
}

// ---------- Gerak NPC ----------
function walk(e, dt, sp) {
  if (!e.path.length) { e.m = 0; return true; }
  const t = e.path[0];
  const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz);
  const s = sp * dt;
  if (d <= s) { e.x = t.x; e.z = t.z; e.path.shift(); }
  else { e.x += dx / d * s; e.z += dz / d * s; e.r = Math.atan2(dx, dz); }
  e.m = 1;
  if (!e.path.length) { e.m = 0; return true; }
  return false;
}

// ---------- Step ----------
export function step(S, dt, emit) {
  const open = S.ph === 'open';
  const np = Math.max(1, Object.keys(S.pl).length);
  if (open) {
    S.tm += dt * MPS;
    if (S.tm >= DAY_END) { S.tm = DAY_END; endDay(S, emit); }
  }
  const h = S.tm / 60;
  // cuaca
  if (S.rainT > 0) { S.rainT -= dt; if (S.rainT <= 0) { S.rainT = 0; S.lk = []; emit({ f: 'toast', s: 'Hujan reda', k: 'info' }); } }
  else if (open && S.rainDay && R() < dt / 70) { startRain(S, 50 + R() * 60); emit({ f: 'toast', s: 'Hujan turun! Siap-siap atap bocor', k: 'warn' }); }

  if (open) {
    // pembeli
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      spawnCustomer(S);
      let iv = 10.5 - (S.rating - 3) * 2.2;
      const rush = (h >= 6.5 && h < 8) || (h >= 12 && h < 13.5) || (h >= 16.5 && h < 18);
      if (rush) iv *= 0.55;
      if (S.rainT > 0) iv *= 1.5;
      if (h >= 19 && !S.up.neon) iv *= 1.45;
      if (S.up.wifi) iv *= 0.8;
      if (S.promo && S.rating < 4.2) iv *= 1.35;
      iv /= 1 + 0.3 * (np - 1);
      S.spawnT = Math.max(2.2, iv * (0.75 + R() * 0.5));
    }
    // event
    const ev = S.ev;
    ev.thief -= dt; ev.rat -= dt; ev.power -= dt; ev.dirt -= dt; ev.job -= dt;
    if (ev.thief <= 0) { if (!S.th.length) spawnThief(S, emit); ev.thief = (S.story.i >= 6 || S.day >= 3) ? 80 + R() * 110 : 999; }
    if (ev.rat <= 0) { if (S.rt.length < 3) spawnRats(S, emit); ev.rat = 70 + R() * 100; }
    if (ev.power <= 0) {
      if (S.power) cutPower(S, emit);
      ev.power = h > 16 ? 110 + R() * 120 : 180 + R() * 200;
      if (S.story.i < 9 && S.day < 4) ev.power = 999;
    }
    if (ev.dirt <= 0) { if (S.dt.length < 8) spawnDirt(S, 1, false); ev.dirt = 35 + R() * 35; }
    if (ev.job <= 0) {
      if ((S.lv >= 3 || S.story.i > 4) && S.jobs.length < 2) { spawnJob(S, null, false); emit({ f: 'toast', s: 'Ada pesanan antar dari warga. Cek HP › Antar', k: 'info' }); emit({ f: 'sfx', s: 'ping' }); }
      ev.job = 55 + R() * 45;
    }
    if (S.rainT > 0) {
      ev.leak -= dt;
      if (ev.leak <= 0 && S.lk.length < 3 && (S.story.i >= 7 || S.day >= 3)) {
        S.lk.push({ id: S.nid++, x: -4.5 + R() * 9, z: -2.6 + R() * 3.2, b: false, t: 32 });
        emit({ f: 'toast', s: 'Atap bocor! Pasang ember', k: 'warn' });
        emit({ f: 'sfx', s: 'drip' });
        ev.leak = 20 + R() * 18;
      }
    }
  }

  // update pembeli
  const drain = S.power ? 1 : 1.35;
  for (const c of S.cu) {
    const arrived = walk(c, dt, c.st === 'leave' ? c.sp * 1.15 : c.sp);
    if (c.st === 'walk' && arrived) {
      c.st = c.sl >= 0 ? 'slot' : 'queue';
      if (c.st === 'slot') { emit({ f: 'sfx', s: 'bell' }); }
      c.r = Math.PI;
    }
    if (c.st === 'queue') {
      c.pat -= dt * 0.35 * drain;
      const fs = SLOTS.findIndex((_, i) => !S.cu.some(x => x.sl === i && x.st !== 'leave'));
      if (fs >= 0) { c.q = -1; c.sl = fs; c.st = 'walk'; c.path = [SLOTS[fs]]; }
    } else if (c.st === 'slot') {
      c.r = Math.PI;
      c.pat -= dt * drain;
      if (c.ty === 'rewel' && !c.swapped && c.pat < c.patMax * 0.6) {
        c.swapped = true;
        const remK = c.rem.filter(([, q]) => q > 0);
        const others = IKEYS.filter(k => isUnlocked(k, S.lv, S.up) && !c.rem.some(([x]) => x === k) && S.stock[k] > 0);
        if (remK.length && others.length) {
          const old = remK[0][0], nk = pick(others);
          for (const e of c.rem) if (e[0] === old) e[0] = nk;
          for (const e of c.ord) if (e[0] === old) e[0] = nk;
          emit({ f: 'float', s: 'Eh ganti deh, ' + ITEMS[nk].i + ' aja!', x: c.x, z: c.z, c: '#ffcf3a' });
          emit({ f: 'sfx', s: 'bad' });
        }
      }
    }
    if ((c.st === 'slot' || c.st === 'queue') && c.pat <= 0) {
      S.rating = clamp(S.rating - 0.1, 1, 5);
      S.ds.lost++; S.tot.lost++; S.ds.streak = 0;
      if (c.paidPart > 0) { S.money += c.paidPart; S.ds.rev += c.paidPart; S.tot.rev += c.paidPart; }
      emit({ f: 'float', s: pick(['Lama banget!', 'Ah, ke MegaMart aja', 'Nggak jadi deh']), x: c.x, z: c.z, c: '#ff6b5b' });
      emit({ f: 'sfx', s: 'bad' });
      leave(S, c);
    }
  }
  S.cu = S.cu.filter(c => !(c.st === 'leave' && !c.path.length));

  // kurir
  for (const o of S.orders) o.eta -= dt;
  if (S.cour < 0) {
    const ready = S.orders.filter(o => o.eta <= 0);
    if (ready.length) { S.courLoad = ready.map(o => o.k); S.orders = S.orders.filter(o => o.eta > 0); S.cour = 0; S.courDropped = false; }
  } else {
    S.cour += dt;
    if (S.cour >= 3.2 && !S.courDropped) {
      S.courDropped = true;
      for (const k of S.courLoad) {
        const n = S.bx.length;
        S.bx.push({ id: S.nid++, k, x: DROP.x - 1 + (n % 3) * 1.0 + (R() - 0.5) * 0.2, z: DROP.z - 1 + Math.floor(n / 3 % 3) * 1.0 + (R() - 0.5) * 0.2 });
      }
      emit({ f: 'toast', s: 'Kurir dateng! Kardus ada di samping kiri warung', k: 'info' });
      emit({ f: 'sfx', s: 'horn' });
    }
    if (S.cour > 8) S.cour = -1;
  }

  // maling
  for (const t of S.th) {
    const sp = t.st === 'run' ? (S.up.cctv ? 3.9 : 5.0) : (S.up.cctv ? 2.2 : 2.6);
    if (t.st === 'come') {
      const done = walk(t, dt, sp);
      if (!t.seen && inWarung(t.x, t.z)) { t.seen = true; emit({ f: 'toast', s: 'Ada maling masuk warung! Tangkep!', k: 'bad' }); emit({ f: 'sfx', s: 'alarm' }); }
      if (done) { t.st = 'steal'; t.t = 2.6; }
    } else if (t.st === 'steal') {
      t.t -= dt; t.m = 0;
      if (t.t <= 0) {
        t.loot = Math.min(3, S.stock[t.k]); S.stock[t.k] -= t.loot;
        t.st = 'run';
        t.path = [{ x: t.s * 5.0, z: -0.8 }, { x: t.s * 7.6, z: -0.8 }, { x: t.s * 9, z: LANE_Z }, { x: t.s * 36, z: LANE_Z }];
        emit({ f: 'float', s: `Maling ngambil ${ITEMS[t.k].i}×${t.loot}!`, x: t.x, z: t.z, c: '#ff6b5b' });
      }
    } else if (t.st === 'run') {
      if (walk(t, dt, sp)) {
        t.gone = true; S.rating = clamp(S.rating - 0.1, 1, 5);
        emit({ f: 'toast', s: 'Malingnya kabur…', k: 'bad' });
      }
    }
    for (const id in S.pl) {
      const p = S.pl[id];
      if (!t.gone && dist(p, t) < 1.25) {
        t.gone = true;
        S.stock[t.k] += t.loot;
        const rw = 30000;
        S.money += rw; S.tot.thief++; S.ds.thief++;
        S.rating = clamp(S.rating + 0.05, 1, 5);
        emit({ f: 'float', s: 'Ketangkep! +' + rpShort(rw), x: t.x, z: t.z, c: '#7dff9a' });
        emit({ f: 'toast', s: `${p.n} nangkep maling!`, k: 'ok' });
        emit({ f: 'sfx', s: 'ok' });
      }
    }
  }
  S.th = S.th.filter(t => !t.gone);

  // tikus
  for (const r of S.rt) {
    r.ang += (R() - 0.5) * dt * 6;
    const P = STATIONS[r.k];
    r.x += Math.sin(r.ang) * dt * 1.2; r.z += Math.cos(r.ang) * dt * 1.2;
    r.x = clamp(r.x, P.x - 1.0, P.x + 1.0); r.z = clamp(r.z, P.z, P.z + 1.1);
    r.t -= dt; r.life -= dt;
    if (r.t <= 0) { r.t = 5; if (S.stock[r.k] > 0) { S.stock[r.k]--; emit({ f: 'float', s: `Tikus makan ${ITEMS[r.k].i}`, x: r.x, z: r.z, c: '#ffb36b' }); } }
    for (const id in S.pl) if (dist(S.pl[id], r) < 0.9) { r.gone = true; r.scared = true; }
    if (r.life <= 0) r.gone = true;
    if (r.scared) { S.tot.rats++; S.ds.rats++; emit({ f: 'float', s: 'Hush!', x: r.x, z: r.z, c: '#ffffff' }); emit({ f: 'sfx', s: 'squeak' }); r.scared = false; }
  }
  S.rt = S.rt.filter(r => !r.gone);

  // bocor
  for (const l of S.lk) {
    if (l.b) continue;
    l.t -= dt;
    if (l.t <= 0) {
      l.gone = true;
      let best = null, bd = 1e9;
      for (const k in STATIONS) { if (k === 'gas' || !isUnlocked(k, S.lv, S.up)) continue; const d = dist(l, STATIONS[k]); if (d < bd) { bd = d; best = k; } }
      if (best && S.stock[best] > 0) { const n = Math.min(2, S.stock[best]); S.stock[best] -= n; emit({ f: 'float', s: `${ITEMS[best].i}×${n} basah`, x: l.x, z: l.z, c: '#8fd0ff' }); }
      S.dt.push({ id: S.nid++, x: l.x, z: l.z });
      emit({ f: 'toast', s: 'Barang kena bocor! Jangan lupa pasang ember', k: 'bad' });
    }
  }
  S.lk = S.lk.filter(l => !l.gone);

  // listrik
  if (!S.power) {
    S.powerT += dt;
    if (S.up.genset && S.powerT > 20) { S.power = true; emit({ f: 'toast', s: 'Genset nyala, listrik aman lagi', k: 'ok' }); }
    if (S.powerT > 40 && !S.spoiled) {
      S.spoiled = true;
      for (const k of ['teh', 'eskrim']) if (S.stock[k] > 1) { const n = Math.floor(S.stock[k] / 2); S.stock[k] -= n; }
      if (S.up.kulkas || S.up.freezer) emit({ f: 'toast', s: 'Kulkas mati kelamaan, sebagian minuman & es krim rusak', k: 'bad' });
    }
  }

  // pesanan antar
  for (const j of S.jobs) {
    if (j.forced && !j.acc) continue;
    j.t -= dt;
    if (j.t <= 0) {
      j.gone = true;
      if (j.acc) { S.rating = clamp(S.rating - 0.1, 1, 5); emit({ f: 'toast', s: `Pesanan ${HOUSES[j.h].n} telat, dibatalin`, k: 'bad' }); }
    }
  }
  S.jobs = S.jobs.filter(j => !j.gone);

  // kotoran nurunin rating pelan-pelan
  if (S.dt.length > 2) S.rating = clamp(S.rating - dt * 0.0015 * (S.dt.length - 2), 1, 5);

  checkMissions(S, emit);
}

// ---------- Aksi pemain ----------
export function act(S, pid, msg, emit) {
  const p = S.pl[pid];
  if (!p) return;
  const a = msg.a;
  if (a === 'use') return use(S, p, String(msg.id || ''), emit);
  if (a === 'drop') {
    if (p.bx) { S.bx.push({ id: S.nid++, k: p.bx, x: p.x, z: p.z + 0.3 }); p.bx = null; }
    else if (p.ca.length) { for (const k of p.ca) S.stock[k] = (S.stock[k] || 0) + 1; p.ca = []; emit({ f: 'float', s: 'Dibalikin ke rak', x: p.x, z: p.z, c: '#ffffff' }); }
    return;
  }
  if (a === 'buy') {
    const k = msg.k; const it = ITEMS[k];
    if (!it || !isUnlocked(k, S.lv, S.up)) return;
    const cost = it.c * it.box;
    if (S.money < cost) return emit({ f: 'toast', s: 'Uangnya nggak cukup', k: 'bad', to: pid });
    if (S.orders.length >= 8) return emit({ f: 'toast', s: 'Pesanan kurir udah kebanyakan', k: 'bad', to: pid });
    S.money -= cost; S.ds.spent += cost;
    const late = R() < 0.18 && S.day >= 2;
    S.orders.push({ k, eta: 16 + R() * 6 + (late ? 18 : 0) });
    emit({ f: 'toast', s: `${p.n} pesen kardus ${it.n} (${rp(cost)})` + (late ? '. Kurirnya bakal telat, jalanan macet' : ''), k: late ? 'warn' : 'info' });
    emit({ f: 'sfx', s: 'ping' });
    return;
  }
  if (a === 'upg') {
    const u = UPG[msg.k];
    if (!u || S.up[msg.k] || S.lv < u.lv) return;
    if (S.money < u.p) return emit({ f: 'toast', s: 'Uangnya nggak cukup', k: 'bad', to: pid });
    S.money -= u.p; S.ds.spent += u.p; S.up[msg.k] = 1; S.xp += 25;
    emit({ f: 'toast', s: `${p.n} beli ${u.n}!`, k: 'ok' }); emit({ f: 'sfx', s: 'lvl' }); emit({ f: 'save' });
    checkMissions(S, emit);
    return;
  }
  if (a === 'price') { if (ITEMS[msg.k] && [0, 1, 2].includes(msg.t)) S.price[msg.k] = msg.t; return; }
  if (a === 'cel') {
    const amt = Math.min(Math.max(0, Math.floor(msg.n || 0)), S.money);
    if (amt <= 0) return;
    S.money -= amt; S.cel += amt;
    emit({ f: 'toast', s: `${p.n} nabung ${rp(amt)} ke celengan`, k: 'ok' }); emit({ f: 'sfx', s: 'coin' });
    checkMissions(S, emit);
    return;
  }
  if (a === 'job') {
    const j = S.jobs.find(x => x.id === msg.id);
    if (!j || j.acc) return;
    j.acc = true; j.t = j.h === 'lurah' ? 200 : 150;
    emit({ f: 'toast', s: `${p.n} nerima pesanan ${HOUSES[j.h].n}`, k: 'info' });
    return;
  }
  if (a === 'next') { if (S.ph === 'sum') startDay(S, emit); return; }
}

function use(S, p, id, emit) {
  const [ty, rest] = id.split(':');
  const near = (o, r) => dist(p, o) < r;
  if (ty === 'sh') {
    const k = rest, st = STATIONS[k];
    if (!st || !isUnlocked(k, S.lv, S.up) || !near(st, 2.6)) return;
    if (p.bx === k) {
      const cap = capOf(k, S.up);
      if (S.stock[k] >= cap - 1) return emit({ f: 'float', s: 'Rak masih penuh', x: st.x, z: st.z, c: '#fff' });
      S.stock[k] = Math.min(cap, S.stock[k] + ITEMS[k].box);
      p.bx = null; S.tot.boxes++; S.ds.boxes++;
      emit({ f: 'float', s: `Rak ${ITEMS[k].i} keisi`, x: st.x, z: st.z, c: '#7dff9a' }); emit({ f: 'sfx', s: 'pick' });
      return;
    }
    if (p.bx || S.stock[k] <= 0 || p.ca.length >= carryCap(S.up)) return;
    S.stock[k]--; p.ca.push(k);
    emit({ f: 'sfx', s: 'pick', to: p.id });
    return;
  }
  if (ty === 'cu') {
    const c = S.cu.find(x => x.id === +rest);
    if (!c || c.st !== 'slot' || !near(c, 3.6)) return;
    const given = [];
    for (const e of c.rem) {
      while (e[1] > 0) { const i = p.ca.indexOf(e[0]); if (i < 0) break; p.ca.splice(i, 1); e[1]--; given.push(e[0]); }
    }
    if (!given.length) return;
    for (const k of given) c.paidPart += priceOf(k, S.price[k]);
    c.rem = c.rem.filter(e => e[1] > 0);
    emit({ f: 'sfx', s: 'pick' });
    if (c.rem.length) {
      emit({ f: 'float', s: 'Kurang: ' + c.rem.map(([k, q]) => ITEMS[k].i + '×' + q).join(' '), x: c.x, z: c.z, c: '#ffcf3a' });
      return;
    }
    // lunas
    let total = c.paidPart; c.paidPart = 0;
    const fast = c.pat / c.patMax > 0.65;
    let tip = 0;
    if (fast) tip += Math.round(total * 0.1 / 500) * 500;
    if (S.up.qris) tip += Math.round(total * 0.05 / 500) * 500;
    if (c.ty === 'pakrt') tip += 5000;
    const sum = total + tip;
    S.money += sum; S.ds.rev += sum; S.tot.rev += sum;
    S.ds.served++; S.tot.served++;
    if (fast) { S.ds.fast++; S.tot.fast++; }
    if (c.ty === 'anak') S.ds.kids++;
    if (c.ty === 'ojol') S.ds.ojol++;
    S.ds.streak++; S.ds.maxStreak = Math.max(S.ds.maxStreak, S.ds.streak);
    const q = c.ord.reduce((a, [, n]) => a + n, 0);
    for (const [k, n] of c.ord) S.ds.sold[k] = (S.ds.sold[k] || 0) + n;
    S.xp += 6 + q * 2;
    let dr = 0.035 + (fast ? 0.02 : 0) + (S.up.radio ? 0.01 : 0);
    const avgTier = c.ord.reduce((a, [k]) => a + S.price[k], 0) / c.ord.length;
    if (avgTier < 0.8) dr += 0.02;
    let msg = '+' + rp(sum) + (tip ? ' (tip)' : '');
    if (avgTier > 1.5 && R() < 0.3) { dr = -0.05; msg += ' · Mahal amat!'; }
    S.rating = clamp(S.rating + dr, 1, 5);
    emit({ f: 'float', s: msg, x: c.x, z: c.z, c: dr < 0 ? '#ffcf3a' : '#7dff9a' });
    emit({ f: 'sfx', s: 'coin' });
    if (R() < 0.18) S.dt.push({ id: S.nid++, x: c.x + (R() - 0.5), z: c.z + 0.4 + R() });
    leave(S, c);
    return;
  }
  if (ty === 'bx') {
    const i = S.bx.findIndex(b => b.id === +rest);
    if (i < 0 || p.bx || p.ca.length || !near(S.bx[i], 2.4)) return;
    p.bx = S.bx[i].k; S.bx.splice(i, 1);
    emit({ f: 'sfx', s: 'pick', to: p.id });
    return;
  }
  if (ty === 'dt') {
    const i = S.dt.findIndex(b => b.id === +rest);
    if (i < 0 || !near(S.dt[i], 2.4)) return;
    S.dt.splice(i, 1); S.tot.dirt++; S.ds.dirt++;
    S.rating = clamp(S.rating + 0.01, 1, 5);
    emit({ f: 'sfx', s: 'sweep' });
    return;
  }
  if (ty === 'lk') {
    const l = S.lk.find(b => b.id === +rest);
    if (!l || l.b || !near(l, 2.4)) return;
    l.b = true; S.tot.leaks++; S.ds.leaks++;
    emit({ f: 'float', s: 'Ember kepasang', x: l.x, z: l.z, c: '#8fd0ff' }); emit({ f: 'sfx', s: 'pick' });
    return;
  }
  if (ty === 'rt') {
    const r = S.rt.find(b => b.id === +rest);
    if (!r || !near(r, 2.6)) return;
    r.gone = true; S.tot.rats++; S.ds.rats++;
    emit({ f: 'float', s: 'Hush!', x: r.x, z: r.z, c: '#ffffff' }); emit({ f: 'sfx', s: 'squeak' });
    S.rt = S.rt.filter(x => !x.gone);
    return;
  }
  if (ty === 'pw') {
    if (S.power || !near(METER, 2.6)) return;
    S.power = true; S.tot.power++; S.ds.power++;
    emit({ f: 'toast', s: `${p.n} benerin listrik. Terang lagi!`, k: 'ok' }); emit({ f: 'sfx', s: 'up' });
    return;
  }
  if (ty === 'hs') {
    const j = S.jobs.find(x => x.id === +rest);
    if (!j || !j.acc || !near(doorOf(j.h), 3.2)) return;
    let given = 0;
    for (const e of j.it) {
      while (e[1] > 0) { const i = p.ca.indexOf(e[0]); if (i < 0) break; p.ca.splice(i, 1); e[1]--; given++; }
    }
    if (!given) return;
    j.it = j.it.filter(e => e[1] > 0);
    const dp = doorOf(j.h);
    if (j.it.length) { emit({ f: 'float', s: 'Kurang: ' + j.it.map(([k, q]) => ITEMS[k].i + '×' + q).join(' '), x: dp.x, z: dp.z, c: '#ffcf3a' }); emit({ f: 'sfx', s: 'pick' }); return; }
    j.gone = true; S.jobs = S.jobs.filter(x => !x.gone);
    S.money += j.rw; S.ds.rev += j.rw; S.tot.rev += j.rw; S.tot.deliv++; S.ds.deliv++; S.xp += 30;
    S.rating = clamp(S.rating + 0.05, 1, 5);
    emit({ f: 'float', s: `Makasih! +${rp(j.rw)}`, x: dp.x, z: dp.z, c: '#7dff9a' });
    emit({ f: 'toast', s: `${p.n} selesai antar ke ${HOUSES[j.h].n}`, k: 'ok' }); emit({ f: 'sfx', s: 'coin' });
    checkMissions(S, emit);
    return;
  }
}

// ---------- Snapshot buat render & dikirim ke guest ----------
const r2 = v => Math.round(v * 100) / 100;
export function makeView(S) {
  const m = STORY[S.story.i];
  const [sc, sg] = storyProg(S);
  return {
    t: 'snap', day: S.day, tm: S.tm, ph: S.ph, money: S.money, cel: S.cel, rating: r2(S.rating), xp: S.xp, lv: S.lv,
    power: S.power, rain: S.rainT > 0, promo: S.promo, won: S.won,
    stock: S.stock, price: S.price, up: S.up, orders: S.orders.map(o => [o.k, Math.max(0, Math.ceil(o.eta))]),
    pl: Object.values(S.pl).map(p => ({ id: p.id, n: p.n, c: p.c, x: r2(p.x), z: r2(p.z), r: r2(p.r), m: p.m, ca: p.ca, bx: p.bx })),
    cu: S.cu.map(c => ({ id: c.id, ty: c.ty, lk: c.look, x: r2(c.x), z: r2(c.z), r: r2(c.r), m: c.m, st: c.st, sl: c.sl, or: c.rem, p: r2(Math.max(0, c.pat / c.patMax)) })),
    bx: S.bx.map(b => ({ id: b.id, k: b.k, x: r2(b.x), z: r2(b.z) })),
    dt: S.dt.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z) })),
    lk: S.lk.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z), b: b.b, t: Math.ceil(b.t) })),
    rt: S.rt.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z), r: r2(b.ang) })),
    th: S.th.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z), r: r2(b.r), m: b.m, st: b.st })),
    jobs: S.jobs.map(j => ({ id: j.id, h: j.h, it: j.it, rw: j.rw, t: Math.ceil(j.t), acc: j.acc, forced: j.forced })),
    cour: r2(S.cour),
    ms: {
      s: m ? { i: S.story.i, n: STORY.length, ti: m.ti, de: m.de, c: sc, g: sg, money: !!m.money, rating: !!m.rating } : null,
      d: S.daily.map(d => ({ ti: d.ti, c: d.end ? S.ds.lost : Math.min(dailyProg(S, d), d.g), g: d.g, ok: d.ok, end: !!d.end, money: !!d.money, rw: d.rw })),
    },
    ds: { served: S.ds.served, lost: S.ds.lost, rev: S.ds.rev },
    sum: S.sum,
  };
}
