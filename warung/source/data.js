// ===== Data & layout bersama (host + guest) =====
export const DAY_START = 360, DAY_END = 1260, DAY_SEC = 480;
export const MPS = (DAY_END - DAY_START) / DAY_SEC; // menit game per detik

export const ITEMS = {
  mie:    { n: 'Mie Instan',  i: '🍜', c: 3000,  lv: 1, box: 10, cap: 12, col: 0xf2c230 },
  snack:  { n: 'Keripik',     i: '🍘', c: 2000,  lv: 1, box: 10, cap: 12, col: 0xe8743b },
  kopi:   { n: 'Kopi Sachet', i: '☕', c: 1500,  lv: 1, box: 10, cap: 12, col: 0x7a4a2c },
  air:    { n: 'Air Mineral', i: '💧', c: 2500,  lv: 1, box: 10, cap: 12, col: 0x8fd0ff },
  telur:  { n: 'Telur',       i: '🥚', c: 2000,  lv: 2, box: 10, cap: 12, col: 0xf1e2c6 },
  beras:  { n: 'Beras 1kg',   i: '🍚', c: 13000, lv: 3, box: 6,  cap: 8,  col: 0xf7f4ea },
  sabun:  { n: 'Sabun',       i: '🧼', c: 4000,  lv: 4, box: 10, cap: 12, col: 0x6fd0b4 },
  teh:    { n: 'Teh Dingin',  i: '🧃', c: 3000,  lv: 4, box: 10, cap: 12, col: 0xd98b2b, need: 'kulkas' },
  gas:    { n: 'Gas 3kg',     i: '🔥', c: 18000, lv: 5, box: 4,  cap: 6,  col: 0x41b35c },
  eskrim: { n: 'Es Krim',     i: '🍦', c: 3500,  lv: 6, box: 10, cap: 12, col: 0xf6b3d0, need: 'freezer' },
};
export const IKEYS = Object.keys(ITEMS);

export const TIERS = [
  { n: 'Murah', m: 1.25 },
  { n: 'Normal', m: 1.5 },
  { n: 'Mahal', m: 1.85 },
];

export const UPG = {
  kipas:    { n: 'Kipas Angin',      p: 150000, lv: 2, d: 'Pembeli lebih sabar 15%' },
  keranjang:{ n: 'Keranjang Belanja', p: 120000, lv: 3, d: 'Bisa bawa 7 barang sekaligus' },
  radio:    { n: 'Radio Dangdut',    p: 200000, lv: 3, d: 'Pembeli betah, rating naik lebih cepat' },
  kulkas:   { n: 'Kulkas Minuman',   p: 350000, lv: 4, d: 'Buka jualan Teh Dingin' },
  sepeda:   { n: 'Sepeda Antar',     p: 300000, lv: 4, d: 'Jalan 30% lebih cepat di luar warung' },
  etalase:  { n: 'Etalase Kaca',     p: 300000, lv: 5, d: 'Kapasitas semua rak +60%' },
  qris:     { n: 'QRIS',             p: 250000, lv: 5, d: 'Bayar cashless, tip +5%, pembeli +10% sabar' },
  freezer:  { n: 'Freezer Es Krim',  p: 450000, lv: 6, d: 'Buka jualan Es Krim' },
  cctv:     { n: 'CCTV',             p: 400000, lv: 6, d: 'Maling langsung ketahuan & larinya lambat' },
  neon:     { n: 'Papan Neon',       p: 250000, lv: 7, d: 'Malam hari tetap rame' },
  wifi:     { n: 'Wi-Fi Gratis',     p: 500000, lv: 8, d: 'Pembeli datang 25% lebih sering' },
  genset:   { n: 'Genset',           p: 600000, lv: 8, d: 'Mati lampu cepet beres sendiri' },
};

export const LVXP = [0, 150, 400, 800, 1300, 1900, 2700, 3600, 4700, 6000];
export const MAXLV = LVXP.length;

export const CTYPES = {
  ibu:   { n: 'Ibu-ibu',      pat: 46, sp: 2.0, pool: ['telur', 'beras', 'sabun', 'mie', 'gas', 'air'], maxK: 3 },
  bapak: { n: 'Bapak-bapak',  pat: 44, sp: 2.2, pool: ['kopi', 'mie', 'air', 'gas', 'snack', 'beras'], maxK: 2 },
  anak:  { n: 'Anak sekolah', pat: 38, sp: 2.7, pool: ['snack', 'eskrim', 'teh', 'air'], maxK: 2 },
  ojol:  { n: 'Driver ojol',  pat: 30, sp: 2.4, pool: ['kopi', 'air', 'teh', 'snack'], maxK: 2 },
  rewel: { n: 'Pembeli rewel', pat: 30, sp: 1.9, pool: IKEYS, maxK: 3 },
  pakrt: { n: 'Pak RT',       pat: 60, sp: 1.9, pool: IKEYS, maxK: 3 },
};

// ===== Layout dunia =====
export const WARUNG = { x0: -6, x1: 6, z0: -4.5, z1: 2.2 };
export const STATIONS = {
  mie:    { x: -4.4, z: -3.25 },
  snack:  { x: -2.2, z: -3.25 },
  kopi:   { x: 0,    z: -3.25 },
  beras:  { x: 2.2,  z: -3.25 },
  sabun:  { x: 4.4,  z: -3.25 },
  air:    { x: -4.8, z: -2.95 },
  telur:  { x: -4.8, z: 0.7 },
  teh:    { x: 4.65, z: -2.9 },
  eskrim: { x: 4.55, z: 0.7 },
  gas:    { x: 7.2,  z: 2.75 },
};
export const SLOTS = [{ x: -3, z: 3.0 }, { x: 0, z: 3.0 }, { x: 3, z: 3.0 }];
export const QUEUE = [{ x: -1.5, z: 4.9 }, { x: 1.5, z: 4.9 }, { x: 0, z: 5.6 }];
export const LANE_Z = 6.6;
export const ROAD = { z0: 7.5, z1: 11.5 };
export const DROP = { x: -8.6, z: 4.0 };
export const METER = { x: 7.0, z: -3.7 };
export const DOOR_L = { x: -7.3, z: -0.8 }, DOOR_R = { x: 7.3, z: -0.8 };
export const BOUNDS = { x0: -44, x1: 44, z0: -30, z1: 30 };

export const HOUSES = {
  rt:    { n: 'Bu RT',          x: -17, z: -1, w: 6, d: 5, rot: 0,       col: 0xf2c6a0, roof: 0xb5523b },
  lurah: { n: 'Pak Lurah',      x: 18,  z: -2, w: 8, d: 6, rot: 0,       col: 0xeef0e6, roof: 0x2f7a57 },
  haji:  { n: 'Pak Haji',       x: -30, z: -1, w: 6, d: 5, rot: 0,       col: 0xcfe3d2, roof: 0x8a4a32 },
  sri:   { n: 'Mbak Sri',       x: 30,  z: -1, w: 6, d: 5, rot: 0,       col: 0xf7e3a1, roof: 0xa0463a },
  kos:   { n: 'Kos Pak Darto',  x: -26, z: 20, w: 7, d: 5, rot: Math.PI, col: 0xd8d0f0, roof: 0x5a5f8a },
  guru:  { n: 'Bu Guru',        x: 26,  z: 20, w: 6, d: 5, rot: Math.PI, col: 0xf4d2d2, roof: 0x9a3f3f },
};
export function doorOf(h) {
  const H = HOUSES[h];
  return H.rot === 0 ? { x: H.x, z: H.z + H.d / 2 + 1.0 } : { x: H.x, z: H.z - H.d / 2 - 1.0 };
}
export const BUILD = {
  megamart: { x: 0, z: 19, w: 16, d: 8 },
  mushola:  { x: -14, z: 20, w: 6, d: 6 },
  sekolah:  { x: 13, z: 21, w: 8, d: 5 },
};

// Kotak tabrakan (x0,z0,x1,z1)
export const AABBS = [];
function box(x0, z0, x1, z1) { AABBS.push([x0, z0, x1, z1]); }
// dinding warung (pintu samping di z -1.6..0)
box(-6.2, -4.75, 6.2, -4.45);
box(-6.25, -4.7, -5.95, -1.6); box(-6.25, 0.0, -5.95, 2.25);
box(5.95, -4.7, 6.25, -1.6);   box(5.95, 0.0, 6.25, 2.25);
// meja depan
box(-6.0, 1.3, 6.0, 2.25);
// rak belakang & samping
box(-5.7, -4.5, 5.7, -3.75);
box(-6.0, -3.8, -5.35, -2.15); box(-6.0, 0.1, -5.35, 1.3);
box(5.3, -3.75, 6.0, -2.1);   box(5.2, 0.1, 6.0, 1.3);
// luar: tumpukan gas, meteran, tong sampah, bale-bale
box(6.7, 1.0, 7.7, 2.05);
box(6.25, -4.1, 6.55, -3.3);
box(-7.15, 2.45, -6.45, 3.15);
box(8.0, 3.4, 10.4, 4.6);
for (const k in HOUSES) { const h = HOUSES[k]; box(h.x - h.w / 2, h.z - h.d / 2, h.x + h.w / 2, h.z + h.d / 2); }
for (const k in BUILD) { const h = BUILD[k]; box(h.x - h.w / 2, h.z - h.d / 2, h.x + h.w / 2, h.z + h.d / 2); }

// Pohon (posisi tetap, seeded)
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function freeAt(x, z, pad) {
  if (z > ROAD.z0 - 2.2 && z < ROAD.z1 + 1.6) return false;
  if (x > -11 && x < 11 && z > -6 && z < 7) return false;
  if (x > -14 && x < 14 && z < -7 && z > -27) return false; // sawah
  for (const b of AABBS) if (x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad) return false;
  return true;
}
export const TREES = [];
{
  const r = mulberry(7);
  let tries = 0;
  while (TREES.length < 46 && tries++ < 3000) {
    const x = (r() * 2 - 1) * 42, z = (r() * 2 - 1) * 29;
    if (!freeAt(x, z, 2.2)) continue;
    let ok = true;
    for (const t of TREES) if ((t.x - x) ** 2 + (t.z - z) ** 2 < 16) { ok = false; break; }
    if (!ok) continue;
    TREES.push({ x, z, palm: r() < 0.45, s: 0.8 + r() * 0.5, rot: r() * 6.28 });
  }
  for (const t of TREES) box(t.x - 0.3, t.z - 0.3, t.x + 0.3, t.z + 0.3);
}

// ===== Helper =====
export function rp(n) {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-Rp ' : 'Rp ') + s;
}
export function rpShort(n) {
  if (Math.abs(n) >= 1e6) return 'Rp ' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1).replace('.', ',') + ' jt';
  if (Math.abs(n) >= 1000) return 'Rp ' + Math.round(n / 1000) + 'rb';
  return rp(n);
}
export function clock(tm) {
  const h = Math.floor(tm / 60) % 24, m = Math.floor(tm % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
export function priceOf(k, tier) {
  return Math.round(ITEMS[k].c * TIERS[tier].m / 500) * 500;
}
export function capOf(k, up) {
  const c = ITEMS[k].cap;
  return up && up.etalase ? Math.round(c * 1.6) : c;
}
export function carryCap(up) { return up && up.keranjang ? 7 : 5; }
export function isUnlocked(k, lv, up) {
  const it = ITEMS[k];
  if (lv < it.lv) return false;
  if (it.need && !(up && up[it.need])) return false;
  return true;
}
export function inWarung(x, z) { return x > WARUNG.x0 && x < WARUNG.x1 && z > WARUNG.z0 && z < WARUNG.z1; }
export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

// Gerak + tabrakan lingkaran vs kotak
export function moveCircle(p, dx, dz, r) {
  p.x += dx; p.z += dz;
  for (let it = 0; it < 2; it++) {
    for (const b of AABBS) {
      const cx = Math.max(b[0], Math.min(p.x, b[2]));
      const cz = Math.max(b[1], Math.min(p.z, b[3]));
      let ox = p.x - cx, oz = p.z - cz;
      const d2 = ox * ox + oz * oz;
      if (d2 < r * r) {
        if (d2 < 1e-8) { // di dalam kotak: dorong ke sisi terdekat
          const l = p.x - b[0], rr = b[2] - p.x, t = p.z - b[1], bt = b[3] - p.z;
          const m = Math.min(l, rr, t, bt);
          if (m === l) p.x = b[0] - r; else if (m === rr) p.x = b[2] + r; else if (m === t) p.z = b[1] - r; else p.z = b[3] + r;
        } else {
          const d = Math.sqrt(d2);
          p.x = cx + ox / d * r; p.z = cz + oz / d * r;
        }
      }
    }
  }
  p.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x));
  p.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, p.z));
}
