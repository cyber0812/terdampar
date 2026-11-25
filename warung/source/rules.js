// Target aksi di jalan (luar warung)
import { ITEMS, HOUSES, METER, placeX, placeName, atWarung } from './data.js';

export const TALKABLE = ['rt', 'haji', 'sri', 'kos', 'guru'];

export function streetTarget(v, me) {
  const c = [];
  const bag = me.bag || [];
  const h = v.tm / 60;
  for (const t of v.th) { const d = Math.abs(t.x - me.x); if (d < 1.8) c.push({ id: 'th:' + t.id, l: 'Tangkep maling!', d: d - 5, ok: true }); }
  if (!v.power) { const d = Math.abs(me.x - METER.x); if (d < 2) c.push({ id: 'pw', l: 'Benerin listrik', d: d - 3, ok: true, hold: v.up.genset ? 1.0 : 2.2 }); }
  for (const j of v.jobs) {
    if (!j.acc) continue;
    const d = Math.abs(me.x - HOUSES[j.h].x);
    if (d > 3.5) continue;
    const has = j.it.some(([k]) => bag.includes(k));
    c.push({ id: 'hs:' + j.id, l: has ? 'Antar ke ' + HOUSES[j.h].n : 'Bawa pesanannya dulu', d: d - 1, ok: has });
  }
  for (const s of v.side) {
    if (s.done) continue;
    const d = Math.abs(me.x - placeX(s.loc));
    if (d > 3.5) continue;
    const open = h >= s.from && h <= s.to;
    c.push({ id: 'sj:' + s.id, l: open ? 'Kerja: ' + s.ti : `Kerjaan mulai jam ${String(Math.floor(s.from)).padStart(2, '0')}.${s.from % 1 ? '30' : '00'}`, d, ok: open, hold: s.dur });
  }
  for (const k of TALKABLE) {
    const d = Math.abs(me.x - placeX(k));
    if (d < 3.2) c.push({ id: 'tk:' + k, l: 'Sapa ' + placeName(k).replace('Rumah ', '').replace('Kos ', ''), d: d + 1, ok: true });
  }
  for (const t of v.dt) { if (t.in) continue; const d = Math.abs(t.x - me.x); if (d < 1.4) c.push({ id: 'dt:' + t.id, l: 'Sapu sampah', d, ok: true, hold: 0.7 }); }
  if (atWarung(me.x)) c.push({ id: 'enter', l: 'Masuk warung', d: 0.5, ok: true });
  if (!c.length) return null;
  c.sort((a, b) => (b.ok - a.ok) || (a.d - b.d));
  return c[0];
}
