// ===== Simulasi host (otoritatif) — versi jalan kiri-kanan =====
import {
  DAY_START, DAY_END, MPS, ITEMS, IKEYS, UPG, LVXP, MAXLV, CTYPES, NAMES, COUNTER, QUEUE, LANE_Z, METER,
  HOUSES, PLACES, placeX, priceOf, capOf, isUnlocked, atWarung, rp, rpShort, BAG_CAP, HARI,
} from './data.js';

const R = Math.random;
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lower = k => ITEMS[k].n.toLowerCase();
const itemsText = o => o.map(([k, q]) => `${lower(k)} ${q}`).join(', ');

// ---------- Misi cerita ----------
export const STORY = [
  { ti: 'Warung Warisan', de: 'Warung Mbah Sarni udah lama tutup dan kotor. Tap kotoran di warung buat nyapu (4 kotoran).', key: 'dirt', g: 4, rw: 50000,
    on: S => { for (let i = 0; i < 4; i++) S.dt.push({ id: S.nid++, x: -3 + i * 2, z: -1.6 + (i % 2) * 0.7, in: true }); } },
  { ti: 'Buka Warung!', de: 'Tap barang yang disebut pembeli biar masuk kresek, terus tap kreseknya buat nyerahin. Layani 5 pembeli.', key: 'served', g: 5, rw: 50000 },
  { ti: 'Stok Pertama', de: 'Tap Stok, pesen kardus. Kurir nganter pakai mobil bak, terus bongkar 2 kardus (tahan tombolnya).', key: 'boxes', g: 2, rw: 60000 },
  { ti: 'Kenalan sama Bu RT', de: 'Tap Keluar Warung, jalan ke kiri sampai Rumah Bu RT, terus tap Sapa.', fn: S => [S.talk.rt ? 1 : 0, 1], rw: 50000, place: 'rt' },
  { ti: 'Makin Dikenal', de: 'Terus layani pembeli sampai warung naik ke Level 2.', fn: S => [Math.min(S.lv, 2), 2], rw: 75000 },
  { ti: 'Titipan Bu RT', de: 'Bu RT nitip belanjaan. Terima di HP › Antar, masukin barangnya ke kresek, antar ke Rumah Bu RT.', key: 'deliv', g: 1, rw: 100000,
    on: S => spawnJob(S, 'rt', true) },
  { ti: 'Gerah Banget', de: 'Pembeli pada kepanasan. Beli Kipas angin di menu Upgrade.', fn: S => [S.up.kipas ? 1 : 0, 1], rw: 50000 },
  { ti: 'Awas Maling!', de: 'Ada maling yang ngincer warung. Tap "Tangkep" pas dia nyolong, atau kejar di jalan.', key: 'thief', g: 1, rw: 100000,
    on: S => { S.ev.thief = 5; } },
  { ti: 'Cari Tambahan', de: 'Ambil satu kerja sampingan (panel kanan). Datang ke tempatnya pas jamnya, terus tahan tombol Kerja.', key: 'side', g: 1, rw: 60000 },
  { ti: 'Musim Hujan', de: 'Hujan deras, atap warung bocor! Tap tetesan air buat pasang ember (2 titik).', key: 'leaks', g: 2, rw: 80000,
    on: S => { S.rainT = Math.max(S.rainT, 150); S.ev.leak = 3; } },
  { ti: 'Saingan Seberang', de: 'MegaMart buka di ujung jalan. Buktiin warung kalian masih juara: omzet Rp700rb dalam 1 hari.', fn: S => [Math.min(S.ds.rev, 700000), 700000], rw: 150000, money: true },
  { ti: 'Buku Hutang', de: 'Warga kadang minta ngutang. Kasih utang ke 1 orang (catatannya ada di Buku Hutang).', key: 'debt', g: 1, rw: 50000 },
  { ti: 'Gelap Gulita', de: 'Listrik sering padam. Kalau mati lampu, keluar terus benerin di meteran kiri warung.', key: 'power', g: 1, rw: 80000,
    on: S => { S.ev.power = 6; } },
  { ti: 'Arisan Ibu-ibu', de: 'Terima pesanan borongan dari Bu RT, terus layani sampai beres.', key: 'bulk', g: 1, rw: 150000,
    on: S => { S.ev.offer = 8; } },
  { ti: 'Pelayanan Prima', de: 'Biar warga setia, capai reputasi bintang 4,5.', fn: S => [Math.min(S.rating, 4.5), 4.5], rw: 200000, rating: true },
  { ti: 'Adu Laris', de: 'Kalahin MegaMart: layani 45 pembeli dalam 1 hari.', fn: S => [Math.min(S.ds.served, 45), 45], rw: 300000 },
  { ti: 'Warung Kompak Jaya', de: 'Kumpulin Rp10.000.000 di Celengan Renovasi (HP › Celengan) biar warung jadi toko kelontong.', fn: S => [Math.min(S.cel, 1e7), 1e7], rw: 0, money: true, final: true },
];
const TALKS = {
  rt: [['Bu RT Yati', 'Eh, kalian yang nerusin warung Mbah Sarni ya? Alhamdulillah, warga seneng warungnya buka lagi.'],
       ['Bu RT Yati', 'Hati-hati ya, MegaMart di ujung jalan lagi gencar promo. Tapi warga sini lebih seneng belanja ke tetangga sendiri.']],
  haji: [['Pak Haji Darmo', 'Assalamualaikum. Kalau sore suka ada kerja bakti di masjid, bantu-bantu ya, lumayan buat tambahan.']],
  sri: [['Mbak Sri', 'Aku jualan online lho. Kadang butuh orang buat bantu packing, nanti aku kabarin.']],
  kos: [['Pak Darto', 'Anak-anak kos sering laper malem-malem. Warung kalian buka sampai jam sembilan kan?']],
  guru: [['Bu Guru Ratna', 'Murid-murid pulang sekolah jam satu, biasanya pada nyerbu jajanan. Siapin stok ciki ya!']],
};

// ---------- Kerja sampingan ----------
const SIDE = [
  { ti: 'Bantu Pak Haji angkat galon', loc: 'haji', from: 8, to: 11, pay: 40000, dur: 4 },
  { ti: 'Bersihin halaman masjid', loc: 'masjid', from: 15, to: 17.5, pay: 35000, dur: 5 },
  { ti: 'Bantu panen di sawah', loc: 'sawah', from: 7, to: 10.5, pay: 60000, dur: 6 },
  { ti: 'Jaga pos ronda', loc: 'pos', from: 19, to: 21, pay: 50000, dur: 5 },
  { ti: 'Bantu Mbak Sri packing pesanan', loc: 'sri', from: 13, to: 16, pay: 40000, dur: 4 },
  { ti: 'Benerin genteng Bu Guru', loc: 'guru', from: 10, to: 14, pay: 45000, dur: 5 },
  { ti: 'Angkut kardus di gudang MegaMart', loc: 'megamart', from: 16, to: 19, pay: 55000, dur: 5 },
  { ti: 'Cat pagar kos Pak Darto', loc: 'kos', from: 9, to: 15, pay: 50000, dur: 6 },
];

// ---------- Misi harian ----------
function genDaily(S) {
  const lv = S.lv, unl = IKEYS.filter(k => isUnlocked(k, lv, S.up) && !ITEMS[k].digital);
  const pool = [
    () => { const g = 10 + lv * 3; return { ty: 'served', ti: `Layani ${g} pembeli`, g }; },
    () => { const k = pick(unl); const g = 6 + lv * 2; return { ty: 'sold', k, ti: `Jual ${g} ${lower(k)}`, g }; },
    () => { const g = (200 + lv * 80) * 1000; return { ty: 'rev', ti: `Omzet ${rpShort(g)}`, g, money: true }; },
    () => ({ ty: 'nolost', ti: 'Maksimal 2 pembeli kabur', g: 2, end: true }),
    () => { const g = 4 + Math.floor(lv / 2); return { ty: 'fast', ti: `Layani ${g} pembeli dengan cepat`, g }; },
    () => { const g = 2 + Math.floor(lv / 3); return { ty: 'boxes', ti: `Bongkar ${g} kardus`, g }; },
    () => ({ ty: 'dirt', ti: 'Sapu 4 kotoran', g: 4 }),
    () => { const g = 7 + lv; return { ty: 'streak', ti: `Combo ${g} pembeli tanpa ada yang kabur`, g }; },
    () => ({ ty: 'kids', ti: 'Layani 4 anak sekolah', g: 4 }),
    () => ({ ty: 'ojol', ti: 'Layani 4 driver ojol', g: 4 }),
    () => ({ ty: 'side', ti: 'Selesaikan 1 kerja sampingan', g: 1 }),
  ];
  if (lv >= 3 || S.story.i > 5) pool.push(() => ({ ty: 'deliv', ti: 'Selesaikan 1 antaran', g: 1 }));
  if (S.day >= 2) pool.push(() => ({ ty: 'rats', ti: 'Usir 3 tikus', g: 3 }));
  const out = [], used = new Set();
  let guard = 0;
  while (out.length < 3 && guard++ < 60) {
    const m = pick(pool)();
    if (used.has(m.ty)) continue;
    used.add(m.ty);
    m.rw = Math.round((30 + lv * 12 + R() * 30) / 5) * 5000;
    m.xp = 20 + lv * 4; m.ok = false;
    out.push(m);
  }
  return out;
}
function dailyProg(S, m) {
  const d = S.ds;
  if (m.ty === 'sold') return d.sold[m.k] || 0;
  if (m.ty === 'nolost') return d.lost;
  if (m.ty === 'streak') return d.maxStreak;
  return d[m.ty] || 0;
}

// ---------- State ----------
function freshDay() {
  return { served: 0, lost: 0, rev: 0, spent: 0, sold: {}, fast: 0, boxes: 0, deliv: 0, thief: 0, rats: 0, dirt: 0, leaks: 0, power: 0, kids: 0, ojol: 0, streak: 0, maxStreak: 0, side: 0, debt: 0, bulk: 0 };
}
const TOT0 = () => ({ served: 0, lost: 0, rev: 0, dirt: 0, boxes: 0, deliv: 0, thief: 0, rats: 0, leaks: 0, power: 0, fast: 0, side: 0, debt: 0, bulk: 0 });
export function newState(save) {
  const S = {
    nid: 1, day: 1, tm: DAY_START, ph: 'open', money: 150000, cel: 0, rating: 3.0, xp: 0, lv: 1,
    power: true, powerT: 0, spoiled: false, rainT: 0, rainDay: false, promo: false, won: false,
    stock: Object.fromEntries(IKEYS.map(k => [k, 0])),
    price: Object.fromEntries(IKEYS.map(k => [k, 1])),
    up: {}, orders: [], pl: {}, cu: [], bx: [], dt: [], lk: [], rt: [], th: [], jobs: [], side: [], debts: [], offer: null,
    cour: -1, courLoad: [], courDropped: false, talk: {},
    tot: TOT0(), ds: freshDay(), story: { i: 0, base: {} }, daily: [], unl: null,
    spawnT: 7, ev: { thief: 999, rat: 999, power: 999, leak: 999, dirt: 40, job: 45, offer: 999 }, sum: null,
  };
  Object.assign(S.stock, { mieg: 8, mier: 8, telur: 10, air: 8, teh: 6, kopi: 12, ciki: 8 });
  if (save) {
    for (const k of ['day', 'money', 'cel', 'rating', 'xp', 'lv', 'stock', 'price', 'up', 'tot', 'story', 'won', 'unl', 'debts', 'talk']) if (save[k] !== undefined) S[k] = save[k];
    S.stock = Object.assign(Object.fromEntries(IKEYS.map(k => [k, 0])), S.stock);
    S.price = Object.assign(Object.fromEntries(IKEYS.map(k => [k, 1])), S.price);
    S.tot = Object.assign(TOT0(), S.tot || {});
    S.debts = S.debts || []; S.talk = S.talk || {};
    S.day = (S.day || 1) - 1;
    startDay(S, () => {});
    const cur = STORY[S.story.i];
    if (cur && cur.on && S.story.i > 0) cur.on(S);
    return S;
  }
  S.daily = genDaily(S); S.side = genSide(S);
  S.story.base = { ...S.tot };
  STORY[0].on(S);
  return S;
}
export function saveData(S) {
  const { day, money, cel, rating, xp, lv, stock, price, up, tot, story, won, unl, debts, talk } = S;
  return { v: 2, day, money, cel, rating, xp, lv, stock, price, up, tot, story, won, unl, debts, talk, at: Date.now() };
}
function genSide(S) { return [...SIDE].sort(() => R() - 0.5).slice(0, 3).map(s => ({ id: S.nid++, ...s, done: null })); }

// ---------- Pemain ----------
export function addPlayer(S, id, n, c) {
  const idx = Object.keys(S.pl).length;
  S.pl[id] = { id, n: String(n || 'Pemain').slice(0, 12), c: c | 0, x: -1 + idx * 1.4, r: 1, m: 0, w: true, bag: [], en: 100 };
  return S.pl[id];
}
export function removePlayer(S, id) {
  const p = S.pl[id];
  if (!p) return;
  for (const k of p.bag) if (!ITEMS[k].digital) S.stock[k] = (S.stock[k] || 0) + 1;
  delete S.pl[id];
}
export function setPlayerPos(S, id, x, r, m) {
  const p = S.pl[id];
  if (!p || !isFinite(x)) return;
  if (!p.w) p.x = clamp(x, -66, 66);
  p.r = r > 0 ? 1 : -1; p.m = m && !p.w ? 1 : 0;
}

// ---------- Spawner ----------
function spawnDirt(S, n, inside) {
  for (let i = 0; i < n; i++) {
    if (inside) S.dt.push({ id: S.nid++, x: -3.5 + R() * 7, z: -1.9 + R() * 1.1, in: true });
    else S.dt.push({ id: S.nid++, x: (R() < 0.5 ? -1 : 1) * (2.5 + R() * 4), z: LANE_Z + 0.3 + R() * 0.5, in: false });
  }
}
function spawnJob(S, house, forced) {
  const unl = IKEYS.filter(k => isUnlocked(k, S.lv, S.up) && !ITEMS[k].digital);
  const n = forced ? 4 : 2 + Math.floor(R() * 4);
  const it = {};
  const ks = [...unl].sort(() => R() - 0.5).slice(0, Math.min(unl.length, 1 + Math.floor(R() * 3)));
  for (let i = 0; i < n; i++) { const k = ks[i % ks.length]; it[k] = (it[k] || 0) + 1; }
  const h = house || pick(Object.keys(HOUSES));
  let val = 0; for (const k in it) val += priceOf(k, S.price[k]) * it[k];
  const rw = val + Math.round((8 + Math.abs(HOUSES[h].x) * 0.5) / 5) * 5000;
  S.jobs.push({ id: S.nid++, h, it: Object.entries(it), rw, t: forced ? 9999 : 60, acc: false, forced: !!forced });
}
function genOrder(S, ty) {
  const T = CTYPES[ty];
  let pool = T.pool.filter(k => isUnlocked(k, S.lv, S.up));
  if (!pool.length) pool = IKEYS.filter(k => isUnlocked(k, S.lv, S.up) && !ITEMS[k].digital);
  const inS = pool.filter(k => S.stock[k] > 0 || ITEMS[k].digital);
  const base = inS.length && R() < 0.85 ? inS : pool;
  const maxQ = Math.min(8, 2 + Math.floor(S.lv / 2));
  const kinds = Math.min(base.length, 1 + Math.floor(R() * T.maxK));
  const ks = [...base].sort(() => R() - 0.5).slice(0, kinds);
  let total = Math.max(kinds, Math.min(maxQ, kinds + Math.floor(R() * (maxQ - kinds + 1))));
  if (ty === 'anak' || ty === 'ojol') total = Math.min(total, 3);
  const o = {};
  for (let i = 0; i < total; i++) { const k = ks[i % ks.length]; if (ITEMS[k].digital && o[k]) continue; o[k] = (o[k] || 0) + 1; }
  return Object.entries(o);
}
const LINES = {
  ibu: ['Permisi… mau beli {i} ya.', 'Aduh, buat masak nih. {i}.', 'Mas, {i} dong.', 'Ada {i}? Lagi buru-buru.'],
  bapak: ['Bos, {i}.', 'Mas, ada {i}?', 'Pagi! {i}, sekalian ngobrol.', '{i}. Kembaliannya pas ya.'],
  anak: ['Kak, {i}!', 'Kakak, aku mau {i}. Uangnya pas kok!', '{i} ya Kak, disuruh Ibu.'],
  ojol: ['Cepet ya Bos, ada orderan. {i}.', 'Mampir bentar. {i}.'],
  rewel: ['Yang bagus ya, jangan yang penyok. {i}.', 'Kok lama sih? {i}!'],
  rt: ['Buat arisan nanti sore, saya borong {i}.'],
};
const THANKS = ['Sip, makasih ya. Laris manis!', 'Makasih, Mas!', 'Mantap, cepet banget.', 'Nuhun ya!', 'Makasih, besok ke sini lagi.'];
function spawnCustomer(S, forceTy, ord, nm) {
  const freeSlot = COUNTER.findIndex((_, i) => !S.cu.some(c => c.sl === i && c.st !== 'leave'));
  const qUsed = S.cu.filter(c => c.q >= 0 && c.st !== 'leave').length;
  if (!forceTy && freeSlot < 0 && qUsed >= QUEUE.length) return null;
  const h = S.tm / 60;
  let ty = forceTy;
  if (!ty) {
    const r = R();
    if (h >= 12.5 && h < 14.5 && r < 0.45) ty = 'anak';
    else if (h < 9 && r < 0.35) ty = 'ojol';
    else if (S.day >= 2 && r < 0.1) ty = 'rewel';
    else ty = pick(['ibu', 'ibu', 'bapak', 'bapak', 'anak', 'ojol']);
  }
  const T = CTYPES[ty];
  const side = R() < 0.5 ? -1 : 1;
  const c = {
    id: S.nid++, ty, nm: nm || pick(NAMES[ty]), look: Math.floor(R() * 9999), x: side * (22 + R() * 6), z: LANE_Z, r: -side, m: 1,
    st: 'walk', sl: -1, q: -1, path: [], ord: ord || genOrder(S, ty), rem: null, sp: T.sp * (0.9 + R() * 0.2),
    pat: 0, patMax: 0, swapped: false, paidPart: 0, ask: 0, bulk: ty === 'rt', say: '', sayT: 0,
  };
  c.rem = c.ord.map(([k, q]) => [k, q]);
  c.line = pick(LINES[ty]).replace('{i}', itemsText(c.ord));
  let mult = 1;
  if (S.up.kipas) mult *= 1.15;
  if (S.up.radio) mult *= 1.1;
  if (S.up.qris) mult *= 1.1;
  const avgTier = c.ord.reduce((a, [k]) => a + S.price[k], 0) / c.ord.length;
  if (avgTier < 0.8) mult *= 1.15; else if (avgTier > 1.5) mult *= 0.82;
  c.patMax = c.pat = T.pat * mult;
  if (freeSlot >= 0) { c.sl = freeSlot; c.path = [{ x: COUNTER[freeSlot].x, z: LANE_Z }, COUNTER[freeSlot]]; }
  else { const qi = QUEUE.findIndex((_, i) => !S.cu.some(x => x.q === i && x.st !== 'leave')); c.q = qi < 0 ? 0 : qi; c.path = [{ x: QUEUE[c.q].x, z: LANE_Z }, QUEUE[c.q]]; }
  S.cu.push(c);
  return c;
}
function leave(S, c, say) {
  if (c.st === 'leave') return;
  c.st = 'leave';
  const side = c.x < 0 ? -1 : 1;
  c.path = [{ x: c.x, z: LANE_Z }, { x: side * 34, z: LANE_Z }];
  c.sl = -1; c.q = -1; c.ask = 0;
  if (say) { c.say = say; c.sayT = 3; }
}
function spawnThief(S, emit) {
  const st = IKEYS.filter(k => ITEMS[k].cat === 'camilan' && isUnlocked(k, S.lv, S.up) && S.stock[k] > 0);
  if (!st.length) return;
  const s = R() < 0.5 ? -1 : 1;
  S.th.push({ id: S.nid++, x: s * 30, z: LANE_Z, r: -s, m: 1, st: 'come', k: pick(st), s, t: 0, loot: 0, seen: false, path: [{ x: s * 3.0, z: LANE_Z }, { x: s * 3.0, z: 1.1 }] });
  if (S.up.cctv) { S.th[S.th.length - 1].seen = true; emit({ f: 'toast', s: 'CCTV: ada maling mau ke warung!', k: 'bad' }); emit({ f: 'sfx', s: 'alarm' }); }
}
function spawnRats(S, emit) {
  const st = IKEYS.filter(k => !ITEMS[k].digital && isUnlocked(k, S.lv, S.up) && S.stock[k] > 0);
  if (!st.length) return;
  const n = 1 + Math.floor(R() * Math.min(3, S.day));
  for (let i = 0; i < n; i++) S.rt.push({ id: S.nid++, k: pick(st), x: -3 + R() * 6, z: -2.3 + R() * 0.4, t: 6, life: 70, ang: R() * 6.28 });
  emit({ f: 'toast', s: 'Ada tikus di warung! Tap tikusnya buat ngusir', k: 'bad' }); emit({ f: 'sfx', s: 'squeak' });
}
function cutPower(S, emit) {
  if (!S.power) return;
  S.power = false; S.powerT = 0; S.spoiled = false;
  emit({ f: 'toast', s: 'Mati lampu! Keluar, benerin di meteran kiri warung', k: 'bad' }); emit({ f: 'sfx', s: 'down' });
}
function spawnOffer(S, emit) {
  if (S.offer) return;
  const unl = IKEYS.filter(k => isUnlocked(k, S.lv, S.up) && !ITEMS[k].digital && S.stock[k] >= 3);
  if (unl.length < 2) return;
  const ks = [...unl].sort(() => R() - 0.5).slice(0, 3);
  const it = ks.map(k => [k, Math.min(S.stock[k] - 1, 2 + Math.floor(R() * 5))]).filter(([, q]) => q > 0);
  let total = 0; for (const [k, q] of it) total += priceOf(k, S.price[k]) * q;
  S.offer = { id: S.nid++, n: 'Bu RT Yati', it, total, t: 45, why: pick(['buat arisan ibu-ibu nanti sore', 'buat pengajian di masjid', 'buat syukuran cucu', 'buat kerja bakti RT']) };
  emit({ f: 'offer' }); emit({ f: 'sfx', s: 'ping' });
}

// ---------- Hari ----------
function startDay(S, emit) {
  S.day++; S.tm = DAY_START; S.ph = 'open'; S.sum = null;
  S.ds = freshDay();
  S.daily = genDaily(S); S.side = genSide(S);
  S.cu = []; S.th = []; S.rt = []; S.lk = []; S.jobs = S.jobs.filter(j => j.forced); S.offer = null;
  S.power = true; S.rainT = 0;
  S.rainDay = S.day >= 2 && R() < 0.32;
  S.promo = (S.day >= 3 && R() < 0.33) || S.story.i === 10;
  S.spawnT = 5;
  for (const id in S.pl) S.pl[id].en = 100;
  const late = S.story.i >= 7 || S.day >= 3;
  S.ev.thief = late ? 60 + R() * 120 : 999;
  S.ev.rat = S.day >= 2 ? 50 + R() * 90 : 999;
  S.ev.power = S.story.i >= 12 || S.day >= 4 ? 120 + R() * 200 : 999;
  S.ev.offer = S.day >= 3 || S.story.i >= 13 ? 90 + R() * 150 : 999;
  S.ev.leak = 20; S.ev.dirt = 40; S.ev.job = 30;
  for (const d of S.debts) {
    if (d.due > S.day) continue;
    if (R() < 0.75) { d.paid = true; S.money += d.amt; emit({ f: 'toast', s: `${d.n} bayar utang ${rp(d.amt)}`, k: 'ok' }); }
    else { d.due = S.day + 1; d.miss = (d.miss || 0) + 1; if (d.miss >= 3) { d.paid = true; emit({ f: 'toast', s: `Utang ${d.n} nggak dibayar-bayar… diikhlasin aja`, k: 'bad' }); } else emit({ f: 'toast', s: `${d.n} belum bisa bayar utang hari ini`, k: 'warn' }); }
  }
  S.debts = S.debts.filter(d => !d.paid);
  const stk = IKEYS.reduce((a, k) => a + (ITEMS[k].digital ? 0 : S.stock[k] || 0), 0);
  if (S.money < 40000 && stk < 10) { S.money += 75000; emit({ f: 'toast', s: 'Mbah Sarni ngirim modal darurat Rp75.000. Pakai buat belanja stok ya', k: 'ok' }); }
  emit({ f: 'toast', s: `${HARI[(S.day - 1) % 7]}, hari ke-${S.day}. Warung buka!`, k: 'info' });
  if (S.promo) emit({ f: 'toast', s: 'MegaMart lagi promo besar. Pembeli bakal lebih sepi, jaga reputasi!', k: 'warn' });
  if (S.rainDay) emit({ f: 'toast', s: 'Ramalan cuaca: hari ini bakal hujan', k: 'info' });
}
function endDay(S, emit) {
  S.ph = 'sum';
  for (const c of S.cu) leave(S, c);
  S.th = []; S.rt = []; S.lk = []; S.rainT = 0; S.power = true; S.offer = null;
  S.jobs = S.jobs.filter(j => j.forced);
  const rent = Math.min(30000 + 10000 * S.lv, Math.max(0, S.money));
  S.money -= rent;
  let bonus = 0;
  for (const m of S.daily) if (m.end && !m.ok && S.ds.lost <= m.g) { m.ok = true; S.money += m.rw; S.xp += m.xp; bonus += m.rw; }
  S.sum = { day: S.day, rev: S.ds.rev, spent: S.ds.spent, rent, bonus, profit: S.ds.rev - S.ds.spent - rent + bonus, served: S.ds.served, lost: S.ds.lost, rating: S.rating, done: S.daily.filter(m => m.ok).length };
  checkLevel(S, emit);
  emit({ f: 'toast', s: 'Jam 21.00, warung tutup. Lihat ringkasan hari ini', k: 'info' }); emit({ f: 'sfx', s: 'lvl' }); emit({ f: 'save' });
}
function checkUnlocks(S, emit) {
  if (!S.unl) S.unl = IKEYS.filter(k => isUnlocked(k, S.lv, S.up));
  for (const k of IKEYS) {
    if (S.unl.includes(k) || !isUnlocked(k, S.lv, S.up)) continue;
    S.unl.push(k);
    if (!ITEMS[k].digital && S.stock[k] < 4) S.stock[k] = Math.ceil(capOf(k, S.up) / 2);
    emit({ f: 'toast', s: `Barang baru: ${ITEMS[k].i} ${ITEMS[k].n}` + (ITEMS[k].digital ? '' : '. Supplier ngasih stok awal gratis!'), k: 'ok' });
  }
}
function checkLevel(S, emit) {
  let lv = 1;
  for (let i = 0; i < MAXLV; i++) if (S.xp >= LVXP[i]) lv = i + 1;
  if (lv > S.lv) {
    S.lv = lv;
    const ups = Object.keys(UPG).filter(k => UPG[k].lv === lv).map(k => UPG[k].n);
    emit({ f: 'toast', s: `Warung naik ke Level ${lv}!` + (ups.length ? ' Upgrade baru: ' + ups.join(', ') : ''), k: 'ok', big: true }); emit({ f: 'sfx', s: 'lvl' });
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
      emit({ f: 'toast', s: `Misi selesai: ${m.ti}` + (m.rw ? ` (+${rp(m.rw)})` : ''), k: 'ok', big: true }); emit({ f: 'sfx', s: 'ok' });
      if (m.final) { S.won = true; emit({ f: 'win' }); }
      S.story.i++; S.story.base = { ...S.tot };
      const n = STORY[S.story.i];
      if (n && n.on) n.on(S);
      emit({ f: 'save' });
    }
  }
  for (const d of S.daily) {
    if (d.ok || d.end) continue;
    if (dailyProg(S, d) >= d.g) { d.ok = true; S.money += d.rw; S.xp += d.xp; emit({ f: 'toast', s: `Misi harian beres: ${d.ti} (+${rp(d.rw)})`, k: 'ok' }); emit({ f: 'sfx', s: 'ok' }); }
  }
  checkLevel(S, emit);
}
function walk(e, dt, sp) {
  if (!e.path.length) { e.m = 0; return true; }
  const t = e.path[0];
  const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz);
  const s = sp * dt;
  if (d <= s) { e.x = t.x; e.z = t.z; e.path.shift(); }
  else { e.x += dx / d * s; e.z += dz / d * s; if (Math.abs(dx) > 0.01) e.r = dx > 0 ? 1 : -1; }
  e.m = 1;
  if (!e.path.length) { e.m = 0; return true; }
  return false;
}

// ---------- Step ----------
export function step(S, dt, emit) {
  const open = S.ph === 'open';
  const np = Math.max(1, Object.keys(S.pl).length);
  if (open) { S.tm += dt * MPS; if (S.tm >= DAY_END) { S.tm = DAY_END; endDay(S, emit); } }
  const h = S.tm / 60;
  if (S.rainT > 0) { S.rainT -= dt; if (S.rainT <= 0) { S.rainT = 0; S.lk = []; emit({ f: 'toast', s: 'Hujan reda', k: 'info' }); } }
  else if (open && S.rainDay && R() < dt / 70) { S.rainT = 50 + R() * 60; emit({ f: 'toast', s: 'Hujan turun! Siap-siap atap bocor', k: 'warn' }); }
  for (const id in S.pl) { const p = S.pl[id]; if (p.m) p.en = Math.max(0, p.en - dt * 0.12); }

  if (open) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      spawnCustomer(S);
      let iv = 11 - (S.rating - 3) * 2.2;
      const rush = (h >= 6.5 && h < 8) || (h >= 12.5 && h < 14) || (h >= 16.5 && h < 18);
      if (rush) iv *= 0.6;
      if (S.rainT > 0) iv *= 1.5;
      if (h >= 19 && !S.up.neon) iv *= 1.45;
      if (S.up.wifi) iv *= 0.8;
      if (S.promo && S.rating < 4.2) iv *= 1.35;
      iv /= 1 + 0.25 * (np - 1);
      S.spawnT = Math.max(2.4, iv * (0.75 + R() * 0.5));
    }
    const ev = S.ev;
    ev.thief -= dt; ev.rat -= dt; ev.power -= dt; ev.dirt -= dt; ev.job -= dt; ev.offer -= dt;
    if (ev.thief <= 0) { if (!S.th.length) spawnThief(S, emit); ev.thief = (S.story.i >= 7 || S.day >= 3) ? 90 + R() * 110 : 999; }
    if (ev.rat <= 0) { if (S.rt.length < 3) spawnRats(S, emit); ev.rat = 70 + R() * 100; }
    if (ev.power <= 0) { if (S.power) cutPower(S, emit); ev.power = (S.story.i >= 12 || S.day >= 4) ? (h > 16 ? 110 + R() * 120 : 180 + R() * 200) : 999; }
    if (ev.dirt <= 0) { if (S.dt.length < 7) spawnDirt(S, 1, R() < 0.5); ev.dirt = 35 + R() * 35; }
    if (ev.job <= 0) {
      if ((S.lv >= 3 || S.story.i > 5) && S.jobs.length < 2) { spawnJob(S, null, false); emit({ f: 'toast', s: 'Ada pesanan antar dari warga. Cek HP › Antar', k: 'info' }); emit({ f: 'sfx', s: 'ping' }); }
      ev.job = 60 + R() * 45;
    }
    if (ev.offer <= 0) { spawnOffer(S, emit); ev.offer = (S.day >= 3 || S.story.i >= 13) ? 160 + R() * 160 : 999; }
    if (S.rainT > 0) {
      ev.leak -= dt;
      if (ev.leak <= 0 && S.lk.length < 3 && (S.story.i >= 9 || S.day >= 3)) {
        S.lk.push({ id: S.nid++, x: -3.5 + R() * 7, z: -1.9 + R() * 0.9, b: false, t: 30 });
        emit({ f: 'toast', s: 'Atap bocor! Tap tetesannya buat pasang ember', k: 'warn' }); emit({ f: 'sfx', s: 'drip' });
        ev.leak = 20 + R() * 18;
      }
    }
  }
  if (S.offer) { S.offer.t -= dt; if (S.offer.t <= 0) { S.offer = null; emit({ f: 'offerGone' }); } }

  const drain = S.power ? 1 : 1.35;
  const anyInside = Object.values(S.pl).some(p => p.w);
  for (const c of S.cu) {
    if (c.sayT > 0) c.sayT -= dt;
    const arrived = walk(c, dt, c.st === 'leave' ? c.sp * 1.15 : c.sp);
    if (c.st === 'walk' && arrived) { c.st = c.sl >= 0 ? 'slot' : 'queue'; if (c.st === 'slot') emit({ f: 'sfx', s: 'bell' }); }
    if (c.st === 'queue') {
      c.pat -= dt * 0.35 * drain;
      const fs = COUNTER.findIndex((_, i) => !S.cu.some(x => x.sl === i && x.st !== 'leave'));
      if (fs >= 0) { c.q = -1; c.sl = fs; c.st = 'walk'; c.path = [{ x: COUNTER[fs].x, z: LANE_Z }, COUNTER[fs]]; }
    } else if (c.st === 'slot' && !c.ask) {
      c.pat -= dt * drain * (anyInside ? 1 : 1.25);
      if (c.ty === 'rewel' && !c.swapped && c.pat < c.patMax * 0.6) {
        c.swapped = true;
        const remK = c.rem.filter(([, q]) => q > 0);
        const others = IKEYS.filter(k => isUnlocked(k, S.lv, S.up) && !c.rem.some(([x]) => x === k) && (S.stock[k] > 0 || ITEMS[k].digital));
        if (remK.length && others.length) {
          const old = remK[0][0], nk = pick(others);
          for (const e of c.rem) if (e[0] === old) e[0] = nk;
          for (const e of c.ord) if (e[0] === old) e[0] = nk;
          c.line = `Eh, ${lower(old)}-nya nggak jadi deh. Ganti ${lower(nk)} aja!`;
          emit({ f: 'sfx', s: 'bad' });
        }
      }
    }
    if ((c.st === 'slot' || c.st === 'queue') && !c.ask && c.pat <= 0) {
      S.rating = clamp(S.rating - (c.bulk ? 0.3 : 0.1), 1, 5);
      S.ds.lost++; S.tot.lost++; S.ds.streak = 0;
      if (c.paidPart > 0) { S.money += c.paidPart; S.ds.rev += c.paidPart; S.tot.rev += c.paidPart; }
      emit({ f: 'sfx', s: 'bad' });
      leave(S, c, pick(['Lama banget!', 'Ah, ke MegaMart aja deh.', 'Nggak jadi deh.']));
    }
    if (c.ask) { c.askT = (c.askT || 25) - dt; if (c.askT <= 0) settleDebt(S, c, false, emit); }
  }
  S.cu = S.cu.filter(c => !(c.st === 'leave' && !c.path.length));

  for (const o of S.orders) o.eta -= dt;
  if (S.cour < 0) {
    const ready = S.orders.filter(o => o.eta <= 0);
    if (ready.length) { S.courLoad = ready.map(o => o.k); S.orders = S.orders.filter(o => o.eta > 0); S.cour = 0; S.courDropped = false; }
  } else {
    S.cour += dt;
    if (S.cour >= 3.4 && !S.courDropped) {
      S.courDropped = true;
      for (const k of S.courLoad) S.bx.push({ id: S.nid++, k });
      emit({ f: 'toast', s: 'Kurir dateng! Bongkar kardusnya di warung', k: 'info' }); emit({ f: 'sfx', s: 'horn' });
    }
    if (S.cour > 8) S.cour = -1;
  }

  for (const t of S.th) {
    const sp = t.st === 'run' ? (S.up.cctv ? 3.0 : 3.6) : (S.up.cctv ? 2.0 : 2.4);
    if (t.st === 'come') {
      const done = walk(t, dt, sp);
      if (!t.seen && Math.abs(t.x) < 10) { t.seen = true; emit({ f: 'toast', s: 'Ada maling deketin warung! Tap "Tangkep" atau kejar', k: 'bad' }); emit({ f: 'sfx', s: 'alarm' }); }
      if (done) { t.st = 'steal'; t.t = 3.4; }
    } else if (t.st === 'steal') {
      t.t -= dt; t.m = 0;
      if (t.t <= 0) {
        t.loot = Math.min(3, S.stock[t.k]); S.stock[t.k] -= t.loot;
        t.st = 'run'; t.path = [{ x: t.x, z: LANE_Z }, { x: t.s * 70, z: LANE_Z }];
        emit({ f: 'float', s: `Maling ngambil ${ITEMS[t.k].i}×${t.loot}! Kejar!`, x: t.x, z: t.z, c: '#ff6b5b' });
      }
    } else if (t.st === 'run') {
      if (walk(t, dt, sp) || Math.abs(t.x) > 64) { t.gone = true; S.rating = clamp(S.rating - 0.1, 1, 5); emit({ f: 'toast', s: 'Malingnya kabur…', k: 'bad' }); }
    }
    for (const id in S.pl) { const p = S.pl[id]; if (!t.gone && !p.w && Math.abs(p.x - t.x) < 1.1) catchThief(S, t, p, emit); }
  }
  S.th = S.th.filter(t => !t.gone);

  for (const r of S.rt) {
    r.ang += (R() - 0.5) * dt * 6;
    r.x = clamp(r.x + Math.sin(r.ang) * dt * 1.2, -3.8, 3.8); r.z = clamp(r.z + Math.cos(r.ang) * dt * 0.4, -2.4, -1.6);
    r.t -= dt; r.life -= dt;
    if (r.t <= 0) { r.t = 6; if (S.stock[r.k] > 0) { S.stock[r.k]--; emit({ f: 'float', s: `Tikus makan ${ITEMS[r.k].i}`, x: r.x, z: r.z, c: '#ffb36b' }); } }
    if (r.life <= 0) r.gone = true;
  }
  S.rt = S.rt.filter(r => !r.gone);

  for (const l of S.lk) {
    if (l.b) continue;
    l.t -= dt;
    if (l.t <= 0) {
      l.gone = true;
      const ks = IKEYS.filter(k => !ITEMS[k].digital && S.stock[k] > 0);
      if (ks.length) { const k = pick(ks), n = Math.min(2, S.stock[k]); S.stock[k] -= n; emit({ f: 'float', s: `${ITEMS[k].i}×${n} basah`, x: l.x, z: l.z, c: '#8fd0ff' }); }
      S.dt.push({ id: S.nid++, x: l.x, z: l.z, in: true });
      emit({ f: 'toast', s: 'Barang kena bocor! Jangan lupa pasang ember', k: 'bad' });
    }
  }
  S.lk = S.lk.filter(l => !l.gone);

  if (!S.power) {
    S.powerT += dt;
    if (S.up.genset && S.powerT > 20) { S.power = true; emit({ f: 'toast', s: 'Genset nyala, listrik aman lagi', k: 'ok' }); }
    if (S.powerT > 40 && !S.spoiled) {
      S.spoiled = true;
      for (const k of ['soda', 'eskrim', 'teh']) if (S.stock[k] > 1) S.stock[k] -= Math.floor(S.stock[k] / 2);
      emit({ f: 'toast', s: 'Kulkas mati kelamaan, sebagian minuman rusak', k: 'bad' });
    }
  }
  for (const j of S.jobs) {
    if (j.forced && !j.acc) continue;
    j.t -= dt;
    if (j.t <= 0) { j.gone = true; if (j.acc) { S.rating = clamp(S.rating - 0.1, 1, 5); emit({ f: 'toast', s: `Pesanan ${HOUSES[j.h].n} telat, dibatalin`, k: 'bad' }); } }
  }
  S.jobs = S.jobs.filter(j => !j.gone);
  if (S.dt.length > 2) S.rating = clamp(S.rating - dt * 0.0015 * (S.dt.length - 2), 1, 5);
  checkMissions(S, emit);
}

function catchThief(S, t, p, emit) {
  t.gone = true;
  S.stock[t.k] += t.loot;
  S.money += 30000; S.tot.thief++; S.ds.thief++;
  S.rating = clamp(S.rating + 0.05, 1, 5);
  emit({ f: 'float', s: 'Ketangkep! +Rp30rb', x: t.x, z: t.z, c: '#7dff9a' });
  emit({ f: 'toast', s: `${p.n} nangkep maling!`, k: 'ok' }); emit({ f: 'sfx', s: 'ok' });
}
function countServe(S, c, fast) {
  S.ds.served++; S.tot.served++;
  if (fast) { S.ds.fast++; S.tot.fast++; }
  if (c.ty === 'anak') S.ds.kids++;
  if (c.ty === 'ojol') S.ds.ojol++;
  if (c.bulk) { S.ds.bulk++; S.tot.bulk++; }
  S.ds.streak++; S.ds.maxStreak = Math.max(S.ds.maxStreak, S.ds.streak);
  const q = c.ord.reduce((a, [, n]) => a + n, 0);
  for (const [k, n] of c.ord) S.ds.sold[k] = (S.ds.sold[k] || 0) + n;
  S.xp += 6 + q * 2;
}
function payCustomer(S, c, emit) {
  const total = c.paidPart; c.paidPart = 0;
  const fast = c.pat / c.patMax > 0.6;
  let tip = 0;
  if (fast) tip += Math.round(total * 0.1 / 500) * 500;
  if (S.up.qris) tip += Math.round(total * 0.05 / 500) * 500;
  if (c.bulk) tip += 20000;
  const sum = total + tip;
  S.money += sum; S.ds.rev += sum; S.tot.rev += sum;
  countServe(S, c, fast);
  let dr = 0.035 + (fast ? 0.02 : 0) + (S.up.radio ? 0.01 : 0) + (c.bulk ? 0.1 : 0);
  const avgTier = c.ord.reduce((a, [k]) => a + S.price[k], 0) / c.ord.length;
  if (avgTier < 0.8) dr += 0.02;
  let say = pick(THANKS);
  if (avgTier > 1.5 && R() < 0.3) { dr = -0.05; say = 'Mahal amat sih…'; }
  S.rating = clamp(S.rating + dr, 1, 5);
  emit({ f: 'money', s: '+' + rp(sum) + (tip ? ' (tip)' : '') });
  emit({ f: 'sfx', s: 'coin' });
  if (R() < 0.18) spawnDirt(S, 1, false);
  leave(S, c, say);
}
function settleDebt(S, c, ok, emit) {
  if (!c.ask) return;
  const amt = c.ask; c.ask = 0;
  if (ok) {
    S.debts.push({ id: S.nid++, n: c.nm, amt, due: S.day + 1 + Math.floor(R() * 2) });
    c.paidPart = 0; S.tot.debt++; S.ds.debt++;
    countServe(S, c, true);
    S.rating = clamp(S.rating + 0.06, 1, 5);
    emit({ f: 'toast', s: `${c.nm} ngutang ${rp(amt)}. Dicatat di Buku Hutang`, k: 'info' });
    leave(S, c, 'Makasih banyak, besok dibayar!');
  } else {
    S.rating = clamp(S.rating - 0.03, 1, 5);
    payCustomer(S, c, emit);
    c.say = 'Yaudah deh, bayar sekarang…';
  }
}

// ---------- Aksi pemain ----------
export function act(S, pid, msg, emit) {
  const p = S.pl[pid];
  if (!p) return;
  const a = msg.a;
  if (a === 'enter') { if (atWarung(p.x)) p.w = true; return; }
  if (a === 'exit') { if (p.w) { p.w = false; p.x = clamp(p.x, -2, 2); } return; }
  if (a === 'use') return use(S, p, String(msg.id || ''), emit);
  if (a === 'give') {
    if (!p.w || !p.bag.length) return;
    let best = null, bs = 0;
    for (const c of S.cu) {
      if (c.st !== 'slot' || c.ask) continue;
      let s = 0; const bag = [...p.bag];
      for (const [k, q] of c.rem) for (let i = 0; i < q; i++) { const j = bag.indexOf(k); if (j >= 0) { bag.splice(j, 1); s++; } }
      if (s > bs || (s === bs && s > 0 && msg.pref === c.id)) { bs = s; best = c; }
    }
    if (!best) { emit({ f: 'toast', s: 'Nggak ada pembeli yang pesen barang itu', k: 'warn', to: pid }); emit({ f: 'sfx', s: 'bad', to: pid }); return; }
    return use(S, p, 'cu:' + best.id, emit);
  }
  if (a === 'bag') { const i = msg.i | 0, k = p.bag[i]; if (k === undefined) return; p.bag.splice(i, 1); if (!ITEMS[k].digital) S.stock[k]++; return; }
  if (a === 'clear') { for (const k of p.bag) if (!ITEMS[k].digital) S.stock[k]++; p.bag = []; return; }
  if (a === 'eat') {
    const k = msg.k, gain = { kopi: 25, mieg: 40, mier: 40, roti: 30, teh: 15, air: 10 }[k];
    if (!gain || !p.w || S.stock[k] <= 0 || p.en >= 98) return;
    S.stock[k]--; p.en = Math.min(100, p.en + gain);
    emit({ f: 'toast', s: `${p.n} ${k === 'kopi' ? 'ngopi dulu' : 'makan ' + lower(k)}. Energi +${gain}%`, k: 'ok' }); emit({ f: 'sfx', s: 'up' });
    return;
  }
  if (a === 'buy') {
    const k = msg.k; const it = ITEMS[k];
    if (!it || it.digital || !isUnlocked(k, S.lv, S.up)) return;
    const cost = it.c * it.box;
    if (S.money < cost) return emit({ f: 'toast', s: 'Uangnya nggak cukup', k: 'bad', to: pid });
    if (S.orders.length >= 8) return emit({ f: 'toast', s: 'Pesanan kurir udah kebanyakan', k: 'bad', to: pid });
    S.money -= cost; S.ds.spent += cost;
    const late = R() < 0.18 && S.day >= 2;
    S.orders.push({ k, eta: 14 + R() * 6 + (late ? 18 : 0) });
    emit({ f: 'toast', s: `${p.n} pesen kardus ${it.n} (${rp(cost)})` + (late ? '. Kurirnya bakal telat, macet' : ''), k: late ? 'warn' : 'info' }); emit({ f: 'sfx', s: 'ping' });
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
  if (a === 'price') { if (ITEMS[msg.k] && !ITEMS[msg.k].fixed && [0, 1, 2].includes(msg.t)) S.price[msg.k] = msg.t; return; }
  if (a === 'cel') {
    const amt = Math.min(Math.max(0, Math.floor(msg.n || 0)), S.money);
    if (amt <= 0) return;
    S.money -= amt; S.cel += amt;
    emit({ f: 'toast', s: `${p.n} nabung ${rp(amt)} ke celengan`, k: 'ok' }); emit({ f: 'sfx', s: 'coin' });
    checkMissions(S, emit);
    return;
  }
  if (a === 'job') { const j = S.jobs.find(x => x.id === msg.id); if (!j || j.acc) return; j.acc = true; j.t = 160; emit({ f: 'toast', s: `${p.n} nerima pesanan ${HOUSES[j.h].n}`, k: 'info' }); return; }
  if (a === 'debt') { const c = S.cu.find(x => x.id === msg.id); if (c && c.ask) settleDebt(S, c, !!msg.ok, emit); checkMissions(S, emit); return; }
  if (a === 'offer') {
    const o = S.offer; if (!o || o.id !== msg.id) return;
    S.offer = null;
    if (msg.ok) {
      const c = spawnCustomer(S, 'rt', o.it.map(([k, q]) => [k, q]), o.n);
      if (c) { c.line = `Ini pesanan borongan ${o.why} ya: ${itemsText(o.it)}.`; c.patMax = c.pat = 140; }
      emit({ f: 'toast', s: `${p.n} nerima pesanan borongan ${o.n}`, k: 'ok' });
    } else { S.rating = clamp(S.rating - 0.02, 1, 5); emit({ f: 'toast', s: 'Pesanan borongan ditolak halus', k: 'info' }); }
    emit({ f: 'offerGone' });
    return;
  }
  if (a === 'next') { if (S.ph === 'sum') startDay(S, emit); return; }
}

function use(S, p, id, emit) {
  const [ty, rest] = id.split(':');
  const nearX = (x, r) => !p.w && Math.abs(p.x - x) < r;
  if (ty === 'sh') {
    const k = rest, it = ITEMS[k];
    if (!it || !p.w || !isUnlocked(k, S.lv, S.up)) return;
    if (p.bag.length >= BAG_CAP) return emit({ f: 'toast', s: 'Kreseknya udah penuh', k: 'warn', to: p.id });
    if (!it.digital) { if (S.stock[k] <= 0) return; S.stock[k]--; }
    p.bag.push(k);
    emit({ f: 'sfx', s: 'pick', to: p.id });
    return;
  }
  if (ty === 'cu') {
    const c = S.cu.find(x => x.id === +rest);
    if (!c || c.st !== 'slot' || !p.w || c.ask) return;
    const given = [];
    for (const e of c.rem) while (e[1] > 0) { const i = p.bag.indexOf(e[0]); if (i < 0) break; p.bag.splice(i, 1); e[1]--; given.push(e[0]); }
    if (!given.length) { emit({ f: 'toast', s: 'Bukan itu pesanannya…', k: 'warn', to: p.id }); emit({ f: 'sfx', s: 'bad', to: p.id }); return; }
    for (const k of given) c.paidPart += priceOf(k, S.price[k]);
    c.rem = c.rem.filter(e => e[1] > 0);
    p.en = Math.max(0, p.en - 0.6);
    emit({ f: 'sfx', s: 'bag' });
    if (c.rem.length) { c.say = 'Masih kurang ' + c.rem.map(([k, q]) => `${lower(k)} ${q}`).join(', ') + '.'; c.sayT = 3; return; }
    if (!c.bulk && S.day >= 2 && c.paidPart >= 8000 && R() < 0.08) {
      c.ask = c.paidPart; c.askT = 25;
      c.line = `Aduh, dompetnya ketinggalan… Boleh ngutang dulu ${rp(c.ask)}? Besok dibayar deh.`;
      emit({ f: 'sfx', s: 'ping' });
      return;
    }
    payCustomer(S, c, emit);
    checkMissions(S, emit);
    return;
  }
  if (ty === 'bx') {
    const i = S.bx.findIndex(b => b.id === +rest);
    if (i < 0 || !p.w) return;
    const k = S.bx[i].k, cap = capOf(k, S.up);
    S.stock[k] = Math.min(cap, S.stock[k] + ITEMS[k].box);
    S.bx.splice(i, 1); S.tot.boxes++; S.ds.boxes++; p.en = Math.max(0, p.en - 3);
    emit({ f: 'toast', s: `Stok ${ITEMS[k].n} keisi (${S.stock[k]})`, k: 'ok', to: p.id }); emit({ f: 'sfx', s: 'pick' });
    checkMissions(S, emit);
    return;
  }
  if (ty === 'dt') {
    const i = S.dt.findIndex(b => b.id === +rest);
    if (i < 0) return;
    const d = S.dt[i];
    if (d.in ? !p.w : !(p.w || nearX(d.x, 2.5))) return;
    S.dt.splice(i, 1); S.tot.dirt++; S.ds.dirt++; p.en = Math.max(0, p.en - 1);
    S.rating = clamp(S.rating + 0.01, 1, 5);
    emit({ f: 'sfx', s: 'sweep' });
    checkMissions(S, emit);
    return;
  }
  if (ty === 'lk') { const l = S.lk.find(b => b.id === +rest); if (!l || l.b || !p.w) return; l.b = true; S.tot.leaks++; S.ds.leaks++; emit({ f: 'float', s: 'Ember kepasang', x: l.x, z: l.z, c: '#8fd0ff' }); emit({ f: 'sfx', s: 'pick' }); checkMissions(S, emit); return; }
  if (ty === 'rt') { const r = S.rt.find(b => b.id === +rest); if (!r || !p.w) return; r.gone = true; S.rt = S.rt.filter(x => !x.gone); S.tot.rats++; S.ds.rats++; emit({ f: 'float', s: 'Hush!', x: r.x, z: r.z, c: '#ffffff' }); emit({ f: 'sfx', s: 'squeak' }); checkMissions(S, emit); return; }
  if (ty === 'th') { const t = S.th.find(b => b.id === +rest); if (!t || t.gone) return; if ((p.w && t.st === 'steal') || nearX(t.x, 1.8)) { catchThief(S, t, p, emit); S.th = S.th.filter(x => !x.gone); checkMissions(S, emit); } return; }
  if (ty === 'pw') { if (S.power || !nearX(METER.x, 2)) return; S.power = true; S.tot.power++; S.ds.power++; emit({ f: 'toast', s: `${p.n} benerin listrik. Terang lagi!`, k: 'ok' }); emit({ f: 'sfx', s: 'up' }); checkMissions(S, emit); return; }
  if (ty === 'hs') {
    const j = S.jobs.find(x => x.id === +rest);
    if (!j || !j.acc || !nearX(HOUSES[j.h].x, 3.5)) return;
    let given = 0;
    for (const e of j.it) while (e[1] > 0) { const i = p.bag.indexOf(e[0]); if (i < 0) break; p.bag.splice(i, 1); e[1]--; given++; }
    if (!given) return;
    j.it = j.it.filter(e => e[1] > 0);
    const hx = HOUSES[j.h].x;
    if (j.it.length) { emit({ f: 'float', s: 'Masih kurang: ' + j.it.map(([k, q]) => ITEMS[k].i + '×' + q).join(' '), x: hx, z: LANE_Z, c: '#ffcf3a' }); emit({ f: 'sfx', s: 'pick' }); return; }
    j.gone = true; S.jobs = S.jobs.filter(x => !x.gone);
    S.money += j.rw; S.ds.rev += j.rw; S.tot.rev += j.rw; S.tot.deliv++; S.ds.deliv++; S.xp += 30; p.en = Math.max(0, p.en - 4);
    S.rating = clamp(S.rating + 0.05, 1, 5);
    emit({ f: 'float', s: `Makasih! +${rp(j.rw)}`, x: hx, z: LANE_Z, c: '#7dff9a' });
    emit({ f: 'toast', s: `${p.n} selesai antar ke ${HOUSES[j.h].n}`, k: 'ok' }); emit({ f: 'sfx', s: 'coin' });
    checkMissions(S, emit);
    return;
  }
  if (ty === 'sj') {
    const s = S.side.find(x => x.id === +rest);
    const h = S.tm / 60;
    if (!s || s.done || !nearX(placeX(s.loc), 3.5) || h < s.from || h > s.to) return;
    s.done = p.n; S.money += s.pay; S.tot.side++; S.ds.side++; S.xp += 20; p.en = Math.max(0, p.en - 18);
    emit({ f: 'float', s: `+${rp(s.pay)}`, x: p.x, z: LANE_Z, c: '#7dff9a' });
    emit({ f: 'toast', s: `${p.n} beres: ${s.ti}`, k: 'ok' }); emit({ f: 'sfx', s: 'coin' });
    checkMissions(S, emit);
    return;
  }
  if (ty === 'tk') {
    const k = rest;
    if (!TALKS[k] || !nearX(placeX(k), 3.5)) return;
    S.talk[k] = 1;
    emit({ f: 'dlg', l: TALKS[k], to: p.id });
    checkMissions(S, emit);
    return;
  }
}

// ---------- Snapshot ----------
const r2 = v => Math.round(v * 100) / 100;
export function makeView(S) {
  const m = STORY[S.story.i];
  const [sc, sg] = storyProg(S);
  return {
    t: 'snap', day: S.day, tm: S.tm, ph: S.ph, money: S.money, cel: S.cel, rating: r2(S.rating), xp: S.xp, lv: S.lv,
    power: S.power, rain: S.rainT > 0, promo: S.promo, won: S.won,
    stock: S.stock, price: S.price, up: S.up, orders: S.orders.map(o => [o.k, Math.max(0, Math.ceil(o.eta))]),
    pl: Object.values(S.pl).map(p => ({ id: p.id, n: p.n, c: p.c, x: r2(p.x), r: p.r, m: p.m, w: p.w, bag: p.bag, en: Math.round(p.en) })),
    cu: S.cu.map(c => ({ id: c.id, ty: c.ty, nm: c.nm, lk: c.look, x: r2(c.x), z: r2(c.z), r: c.r, m: c.m, st: c.st, sl: c.sl, or: c.rem, ord: c.ord, p: r2(Math.max(0, c.pat / c.patMax)), line: c.line, ask: c.ask, bulk: c.bulk, say: c.sayT > 0 ? c.say : '' })),
    bx: S.bx.map(b => ({ id: b.id, k: b.k })),
    dt: S.dt.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z), in: b.in })),
    lk: S.lk.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z), b: b.b, t: Math.ceil(b.t) })),
    rt: S.rt.map(b => ({ id: b.id, k: b.k, x: r2(b.x), z: r2(b.z), r: r2(b.ang) })),
    th: S.th.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z), r: b.r, m: b.m, st: b.st })),
    jobs: S.jobs.map(j => ({ id: j.id, h: j.h, it: j.it, rw: j.rw, t: Math.ceil(j.t), acc: j.acc, forced: j.forced })),
    side: S.side.map(s => ({ id: s.id, ti: s.ti, loc: s.loc, from: s.from, to: s.to, pay: s.pay, dur: s.dur, done: s.done })),
    debts: S.debts.map(d => ({ id: d.id, n: d.n, amt: d.amt, due: d.due })),
    offer: S.offer ? { id: S.offer.id, n: S.offer.n, it: S.offer.it, total: S.offer.total, t: Math.ceil(S.offer.t), why: S.offer.why } : null,
    cour: r2(S.cour), talk: S.talk,
    ms: {
      s: m ? { i: S.story.i, n: STORY.length, ti: m.ti, de: m.de, c: sc, g: sg, money: !!m.money, rating: !!m.rating, place: m.place || null } : null,
      d: S.daily.map(d => ({ ti: d.ti, c: d.end ? S.ds.lost : Math.min(dailyProg(S, d), d.g), g: d.g, ok: d.ok, end: !!d.end, money: !!d.money, rw: d.rw })),
    },
    ds: { served: S.ds.served, lost: S.ds.lost, rev: S.ds.rev },
    sum: S.sum,
  };
}
