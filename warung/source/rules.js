// Cari target interaksi terdekat buat pemain (dipakai client & divalidasi host)
import { ITEMS, STATIONS, METER, HOUSES, doorOf, isUnlocked, capOf, carryCap, dist } from './data.js';

export function findTarget(v, me) {
  const c = [];
  const ca = me.ca || [], bx = me.bx || null;
  const cap = carryCap(v.up);
  // rak barang
  for (const k in STATIONS) {
    if (!isUnlocked(k, v.lv, v.up)) continue;
    const st = STATIONS[k];
    const d = dist(me, st);
    if (d > 1.35) continue;
    const it = ITEMS[k];
    if (bx === k) c.push({ id: 'sh:' + k, l: 'Isi rak ' + it.n, d, ok: v.stock[k] < capOf(k, v.up) - 1, why: 'Rak masih penuh' });
    else if (bx) c.push({ id: 'sh:' + k, l: 'Ini rak ' + it.n, d: d + 2, ok: false });
    else if (v.stock[k] <= 0) c.push({ id: 'sh:' + k, l: it.n + ' habis', d, ok: false });
    else if (ca.length >= cap) c.push({ id: 'sh:' + k, l: 'Tangan penuh', d, ok: false });
    else c.push({ id: 'sh:' + k, l: 'Ambil ' + it.i + ' ' + it.n, d, ok: true });
  }
  // pembeli di meja (dilayani dari dalam warung)
  for (const cu of v.cu) {
    if (cu.sl < 0 || cu.st !== 'slot') continue;
    const dx = Math.abs(cu.x - me.x), dz = cu.z - me.z;
    if (dx > 1.7 || dz < 0.6 || dz > 2.9) continue;
    const d = Math.hypot(dx, dz) - 0.8;
    const need = cu.or.some(([k]) => ca.includes(k));
    if (me.z > 1.4) continue;
    c.push({ id: 'cu:' + cu.id, l: need ? 'Kasih ke pembeli' : 'Pembeli butuh barang lain', d, ok: need });
  }
  // kardus
  for (const b of v.bx) {
    const d = dist(me, b);
    if (d > 1.3) continue;
    if (bx || ca.length) c.push({ id: 'bx:' + b.id, l: 'Kosongin tangan dulu', d, ok: false });
    else c.push({ id: 'bx:' + b.id, l: 'Angkat kardus ' + ITEMS[b.k].i, d, ok: true });
  }
  for (const t of v.dt) { const d = dist(me, t); if (d < 1.2) c.push({ id: 'dt:' + t.id, l: 'Sapu kotoran', d, ok: true, hold: 0.9 }); }
  for (const t of v.lk) { if (t.b) continue; const d = dist(me, t); if (d < 1.3) c.push({ id: 'lk:' + t.id, l: 'Pasang ember', d, ok: true, hold: 0.8 }); }
  for (const t of v.rt) { const d = dist(me, t); if (d < 1.7) c.push({ id: 'rt:' + t.id, l: 'Usir tikus', d: d - 0.5, ok: true }); }
  if (!v.power) { const d = dist(me, METER); if (d < 1.5) c.push({ id: 'pw', l: 'Benerin listrik', d: d - 1, ok: true, hold: v.up.genset ? 1.0 : 2.4 }); }
  // antar pesanan
  for (const j of v.jobs) {
    if (!j.acc) continue;
    const dp = doorOf(j.h);
    const d = dist(me, dp);
    if (d > 2.0) continue;
    const has = j.it.some(([k]) => ca.includes(k));
    c.push({ id: 'hs:' + j.id, l: has ? 'Antar ke ' + HOUSES[j.h].n : 'Bawa pesanan ' + HOUSES[j.h].n, d: d - 0.5, ok: has });
  }
  if (!c.length) return null;
  c.sort((a, b) => (b.ok - a.ok) || (a.d - b.d));
  return c[0];
}
