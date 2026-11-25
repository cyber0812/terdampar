// ===== Data & layout bersama (host + guest) — versi jalan kiri-kanan =====
export const DAY_START = 360, DAY_END = 1260, DAY_SEC = 480;
export const MPS = (DAY_END - DAY_START) / DAY_SEC;
export const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// cat: dapur | camilan | pulsa
export const ITEMS = {
  mieg:   { n: 'Mie goreng',   i: '🍝', c: 2800,  lv: 1, box: 10, cap: 16, cat: 'dapur', col: 0xe8463a },
  mier:   { n: 'Mie rebus',    i: '🍜', c: 2800,  lv: 1, box: 10, cap: 16, cat: 'dapur', col: 0xf2c230 },
  telur:  { n: 'Telur',        i: '🥚', c: 2000,  lv: 1, box: 10, cap: 20, cat: 'dapur', col: 0xf1e2c6 },
  beras:  { n: 'Beras 1kg',    i: '🍚', c: 13000, lv: 2, box: 6,  cap: 12, cat: 'dapur', col: 0xf7f4ea },
  gula:   { n: 'Gula',         i: '🧂', c: 8000,  lv: 2, box: 6,  cap: 12, cat: 'dapur', col: 0xffffff },
  minyak: { n: 'Minyak goreng', i: '🛢️', c: 16000, lv: 3, box: 6,  cap: 12, cat: 'dapur', col: 0xf2b705 },
  sabun:  { n: 'Sabun mandi',  i: '🧼', c: 3500,  lv: 2, box: 10, cap: 14, cat: 'dapur', col: 0xe86f8a },
  deterjen:{ n: 'Deterjen',    i: '🧺', c: 8000,  lv: 3, box: 6,  cap: 12, cat: 'dapur', col: 0x2f7fe0 },
  gas:    { n: 'LPG 3 kg',     i: '🔥', c: 18000, lv: 4, box: 4,  cap: 10, cat: 'dapur', col: 0x41b35c },
  galon:  { n: 'Galon',        i: '🚰', c: 6000,  lv: 4, box: 4,  cap: 10, cat: 'dapur', col: 0x4fa3e0 },
  obat:   { n: 'Obat pusing',  i: '💊', c: 2500,  lv: 5, box: 10, cap: 12, cat: 'dapur', col: 0xdddddd },
  air:    { n: 'Air mineral',  i: '💧', c: 3000,  lv: 1, box: 10, cap: 16, cat: 'camilan', col: 0x8fd0ff },
  teh:    { n: 'Teh botol',    i: '🧃', c: 3500,  lv: 1, box: 10, cap: 16, cat: 'camilan', col: 0xd98b2b },
  kopi:   { n: 'Kopi sachet',  i: '☕', c: 1200,  lv: 1, box: 10, cap: 20, cat: 'camilan', col: 0x6b3e26 },
  ciki:   { n: 'Ciki',         i: '🍿', c: 2000,  lv: 1, box: 10, cap: 16, cat: 'camilan', col: 0xf2a31b },
  permen: { n: 'Permen',       i: '🍬', c: 400,   lv: 2, box: 20, cap: 30, cat: 'camilan', col: 0xf06aa8 },
  biskuit:{ n: 'Biskuit',      i: '🍪', c: 2500,  lv: 2, box: 10, cap: 14, cat: 'camilan', col: 0xc98a4a },
  roti:   { n: 'Roti',         i: '🍞', c: 3500,  lv: 3, box: 10, cap: 14, cat: 'camilan', col: 0xe0a35c },
  kerupuk:{ n: 'Kerupuk',      i: '🍘', c: 800,   lv: 3, box: 20, cap: 30, cat: 'camilan', col: 0xf5e6c0 },
  soda:   { n: 'Soda',         i: '🥤', c: 5500,  lv: 4, box: 10, cap: 14, cat: 'camilan', col: 0xd7263d, need: 'kulkas' },
  eskrim: { n: 'Es krim',      i: '🍦', c: 3500,  lv: 6, box: 10, cap: 14, cat: 'camilan', col: 0xf6b3d0, need: 'freezer' },
  pulsa:  { n: 'Pulsa 10rb',   i: '📱', c: 10500, lv: 3, cat: 'pulsa', digital: true, fixed: 12000 },
  data:   { n: 'Paket 5GB',    i: '📶', c: 25000, lv: 3, cat: 'pulsa', digital: true, fixed: 28000 },
  token:  { n: 'Token 20rb',   i: '⚡', c: 20500, lv: 5, cat: 'pulsa', digital: true, fixed: 22500 },
};
export const IKEYS = Object.keys(ITEMS);
export const CATS = [['dapur', 'Dapur & Rumah Tangga'], ['camilan', 'Minuman & Camilan'], ['pulsa', 'Konter Pulsa']];

export const TIERS = [{ n: 'Murah', m: 1.2 }, { n: 'Normal', m: 1.4 }, { n: 'Mahal', m: 1.75 }];

export const UPG = {
  kipas:   { n: 'Kipas angin',     p: 150000, lv: 2, d: 'Pembeli lebih sabar 15%' },
  radio:   { n: 'Radio dangdut',   p: 200000, lv: 3, d: 'Pembeli betah, reputasi naik lebih cepat' },
  kulkas:  { n: 'Kulkas minuman',  p: 350000, lv: 3, d: 'Buka jualan Soda dingin' },
  etalase: { n: 'Etalase kaca',    p: 300000, lv: 4, d: 'Kapasitas stok semua barang +50%' },
  qris:    { n: 'QRIS',            p: 250000, lv: 4, d: 'Bayar cashless, tip +5%, pembeli 10% lebih sabar' },
  sepeda:  { n: 'Sepeda',          p: 300000, lv: 4, d: 'Jalan 40% lebih cepat di jalan' },
  freezer: { n: 'Freezer es krim', p: 450000, lv: 6, d: 'Buka jualan Es krim' },
  cctv:    { n: 'CCTV',            p: 400000, lv: 6, d: 'Maling langsung ketahuan & larinya lambat' },
  neon:    { n: 'Papan neon',      p: 250000, lv: 7, d: 'Malam hari tetap rame' },
  wifi:    { n: 'Wi-Fi gratis',    p: 500000, lv: 8, d: 'Pembeli datang 25% lebih sering' },
  genset:  { n: 'Genset',          p: 600000, lv: 8, d: 'Mati lampu cepet beres sendiri' },
};
export const LVXP = [0, 150, 400, 800, 1300, 1900, 2700, 3600, 4700, 6000];
export const MAXLV = LVXP.length;

// ===== Pembeli =====
export const CTYPES = {
  ibu:   { pat: 50, sp: 1.9, pool: ['telur', 'beras', 'gula', 'minyak', 'sabun', 'deterjen', 'mier', 'gas', 'galon'], maxK: 3 },
  bapak: { pat: 46, sp: 2.1, pool: ['kopi', 'mieg', 'air', 'gas', 'roti', 'teh', 'pulsa', 'token', 'obat'], maxK: 2 },
  anak:  { pat: 40, sp: 2.5, pool: ['ciki', 'permen', 'eskrim', 'teh', 'biskuit', 'soda', 'kerupuk'], maxK: 2 },
  ojol:  { pat: 32, sp: 2.3, pool: ['kopi', 'air', 'teh', 'roti', 'data', 'pulsa'], maxK: 2 },
  rewel: { pat: 32, sp: 1.8, pool: IKEYS, maxK: 3 },
  rt:    { pat: 90, sp: 1.8, pool: IKEYS, maxK: 3 },
};
export const NAMES = {
  ibu: ['Bu Wati', 'Bu Ida', 'Teh Euis', 'Bu Sumi', 'Mbak Rini', 'Bu Yanti', 'Ceu Popon'],
  bapak: ['Pak Joko', 'Pak Darto', 'Mas Bayu', 'Pak Udin', 'Kang Asep', 'Pak Rahmat'],
  anak: ['Dika', 'Putri', 'Rafi', 'Nisa', 'Bimo', 'Salsa'],
  ojol: ['Mas Ojol', 'Bang Ojol', 'Kang Ojol'],
  rewel: ['Bu Ningsih', 'Tante Lina'],
  rt: ['Bu RT Yati'],
};

// ===== Jalan (x = arah jalan, pemain cuma gerak di x) =====
export const LANE_Z = 1.4;        // garis trotoar tempat orang jalan
export const WALK = { x0: -66, x1: 66 };
export const WARUNG_X = 0;
export const WARUNG = { x0: -4.6, x1: 4.6 };
export const COUNTER = [{ x: -1.3, z: 1.15 }, { x: 1.5, z: 1.15 }];
export const QUEUE = [{ x: -3.6, z: 1.6 }, { x: 3.9, z: 1.6 }, { x: -5.6, z: 1.7 }, { x: 6.0, z: 1.7 }];
export const INSIDE = { z: -1.2 }; // posisi pemain di balik meja
export const METER = { x: -6.0 };
export const DROP = { x: -6.4 };
export const ZONES = [
  { n: 'Rumah Warga', x0: -66, x1: -18 },
  { n: 'Warung & Masjid', x0: -18, x1: 24 },
  { n: 'MegaMart & Sawah', x0: 24, x1: 66 },
];
export const HOUSES = {
  rt:    { n: 'Rumah Bu RT',     x: -24, w: 9, col: 0xf1dfc6, roof: 0xb9462f, two: false },
  haji:  { n: 'Rumah Pak Haji',  x: -36, w: 11, col: 0xeee7da, roof: 0x9b3a2a, two: true },
  sri:   { n: 'Rumah Mbak Sri',  x: -48, w: 8, col: 0xf7e3b5, roof: 0x3d4f6b, two: false },
  kos:   { n: 'Kos Pak Darto',   x: -59, w: 10, col: 0xdad6ec, roof: 0x6b4a8a, two: true },
  guru:  { n: 'Rumah Bu Guru',   x: -12, w: 8, col: 0xf4d6cf, roof: 0xb9462f, two: false },
};
export const PLACES = {
  masjid:   { n: 'Masjid Al-Ikhlas', x: 14 },
  megamart: { n: 'MegaMart', x: 34 },
  sawah:    { n: 'Sawah Pak Lurah', x: 54 },
  pos:      { n: 'Pos Ronda', x: 26 },
};
export function placeX(k) { return HOUSES[k] ? HOUSES[k].x : PLACES[k] ? PLACES[k].x : 0; }
export function placeName(k) { return HOUSES[k] ? HOUSES[k].n : PLACES[k] ? PLACES[k].n : k; }

// ===== Helper =====
export function rp(n) {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-Rp' : 'Rp') + s;
}
export function rpShort(n) {
  if (Math.abs(n) >= 1e6) return 'Rp' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1).replace('.', ',') + 'jt';
  if (Math.abs(n) >= 1000) return 'Rp' + Math.round(n / 1000) + 'rb';
  return rp(n);
}
export function clock(tm) {
  const h = Math.floor(tm / 60) % 24, m = Math.floor(tm % 60);
  return String(h).padStart(2, '0') + '.' + String(m).padStart(2, '0');
}
export function priceOf(k, tier) {
  const it = ITEMS[k];
  if (it.fixed) return it.fixed;
  return Math.round(it.c * TIERS[tier].m / 100) * 100;
}
export function capOf(k, up) {
  const it = ITEMS[k];
  if (it.digital) return 999;
  return up && up.etalase ? Math.round(it.cap * 1.5) : it.cap;
}
export const BAG_CAP = 12;
export function isUnlocked(k, lv, up) {
  const it = ITEMS[k];
  if (lv < it.lv) return false;
  if (it.need && !(up && up[it.need])) return false;
  return true;
}
export function atWarung(x) { return x > WARUNG.x0 - 0.5 && x < WARUNG.x1 + 0.5; }
export function zoneOf(x) { for (const z of ZONES) if (x >= z.x0 && x < z.x1) return z.n; return ZONES[1].n; }
