import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'; import { loadGlb } from '../render/bin.js';
import { BUILD, CELL, FLOOR_H } from '../../shared/data.js';
const H = FLOOR_H, C = CELL;
function box(w, h, d, x, y, z, ux = 1, uy = 1) { const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ux, uv.getY(i) * uy); g.translate(x, y, z); return g; }
function logX(len, r, x, y, z, seg = 9) { const g = new THREE.CylinderGeometry(r, r * 1.03, len, seg, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * len * .6 + y * .37); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return g; }
function logY(len, r, x, y, z) { const g = new THREE.CylinderGeometry(r, r, len, 8); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * len * .6); g.translate(x, y + len / 2, z); return g; }
const M = a => { const f = a.filter(Boolean).map(g => { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; }); return mergeGeometries(f); };
function thatchTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#6d5a2e'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const x = Math.random() * 512, y = Math.random() * 512, l = 40 + Math.random() * 80, h = 34 + Math.random() * 18, li = 28 + Math.random() * 34; g.strokeStyle = `hsl(${h},${38 + Math.random() * 18}%,${li}%)`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 12, y + l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export class Structures {
  constructor(scene, tex, world) {
    this.scene = scene; this.world = world; this.items = new Map(); this.colliders = []; this.floors = []; this.ramps = []; this.group = new THREE.Group(); scene.add(this.group); this.fires = [];
    const clone = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
    this.mats = { log: new THREE.MeshStandardMaterial({ map: tex.bark, normalMap: tex.barkN, roughness: .9, color: 0xffffff, envMapIntensity: 1.4 }), plank: new THREE.MeshStandardMaterial({ map: clone(tex.planks, 1, 1), normalMap: tex.planksN, roughness: .86, color: 0xffffff, envMapIntensity: 1.3 }), dark: new THREE.MeshStandardMaterial({ map: tex.planks2, normalMap: tex.planks2N, roughness: .8 }), thatch: new THREE.MeshStandardMaterial({ map: thatchTexture(), roughness: 1, side: THREE.DoubleSide }), stone: new THREE.MeshStandardMaterial({ map: tex.stone, normalMap: tex.stoneN, roughness: .95 }), cloth: new THREE.MeshStandardMaterial({ color: 0xa8a08c, roughness: 1 }), cloth2: new THREE.MeshStandardMaterial({ color: 0xd9d2bf, roughness: 1 }), metal: new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: .55, metalness: .8 }), glow: new THREE.MeshStandardMaterial({ color: 0x1a0a02, emissive: 0xff5a14, emissiveIntensity: 3 }), water: new THREE.MeshStandardMaterial({ color: 0x3a8fa8, roughness: .1, metalness: .2 }), soil: new THREE.MeshStandardMaterial({ map: tex.forest, color: 0x7a5c42, roughness: 1 }), sail: new THREE.MeshStandardMaterial({ color: 0xd8532e, roughness: .9, side: THREE.DoubleSide }) };
    this.geo = this.buildGeo(); this.glb = {};
  }
  async load() { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); for (const n of ['stone_fire_pit', 'wooden_crate_01', 'wooden_barrels_01', 'treasure_chest']) { const g = await loadGlb(l, `assets/props/${n}.glb`); g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); this.glb[n] = g.scene; } }
  buildGeo() {
    const G = {}, n = 7, r = H / n / 2 * 1.08, stack = (xa = -C / 2, xb = C / 2, ya = 0, yb = H) => { const a = []; for (let i = 0; i < n; i++) { const y = (i + .5) / n * H; if (y < ya || y > yb) continue; const len = xb - xa, ox = (i % 2 ? .03 : -.03); a.push(logX(len + .1, r, (xa + xb) / 2 + ox, y, 0)); } return a; };
    G.foundation = { plank: M([box(C, .14, C, 0, -.07, 0, 1.6, 1.6), ...[-1, 1].map(s => box(C, .22, .16, 0, -.2, s * (C / 2 - .08), 1.5, .1)), ...[-1, 1].map(s => box(.16, .22, C, s * (C / 2 - .08), -.2, 0, .1, 1.5))]), log: M([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => logY(5, .14, a * 1.36, -5.1, b * 1.36))) };
    G.wall = { log: M(stack()) };
    G.window = { log: M([...stack(-C / 2, C / 2, 0, 1), ...stack(-C / 2, C / 2, 2.05, H), ...stack(-C / 2, -.68, 1, 2.05), ...stack(.68, C / 2, 1, 2.05)]), plank: M([box(1.42, .08, .5, 0, 1.0, 0, 1, .2), box(1.42, .08, .5, 0, 2.05, 0, 1, .2), box(.08, 1.1, .5, -.7, 1.53, 0, .2, 1), box(.08, 1.1, .5, .7, 1.53, 0, .2, 1), box(.06, 1.06, .1, 0, 1.53, 0, .1, 1)]) };
    G.doorway = { log: M([...stack(-C / 2, -.56, 0, H), ...stack(.56, C / 2, 0, H), ...stack(-.56, .56, 2.25, H)]), plank: M([box(.1, 2.3, .46, -.58, 1.15, 0, .2, 1), box(.1, 2.3, .46, .58, 1.15, 0, .2, 1), box(1.26, .1, .46, 0, 2.28, 0, 1, .2)]) };
    G.door = { plank: M([box(1.04, 2.18, .07, .52, 1.1, 0, 1, 1), box(1, .12, .1, .52, .4, 0, 1, .1), box(1, .12, .1, .52, 1.8, 0, 1, .1)]), metal: M([box(.05, .05, .16, .94, 1.08, 0)]) };
    G.floor = { plank: M([box(C, .14, C, 0, -.07, 0, 1.6, 1.6), box(C, .2, .14, 0, -.2, -C / 2 + .07, 1.5, .1), box(C, .2, .14, 0, -.2, C / 2 - .07, 1.5, .1)]) };
    { const a = []; const steps = 10; for (let i = 0; i < steps; i++) { const y = (i + .5) / steps * H, z = C / 2 - (i + .5) / steps * C; a.push(box(C * .9, .07, .36, 0, y, z, 1, .2)); } a.push(box(.1, .28, 4.3, -C * .46, H / 2, 0, .1, 2).rotateX(0)); G.stair = { plank: M(a.slice(0, steps)), log: M([...[-1, 1].map(s => { const g = logX(4.3, .09, 0, 0, 0, 6); g.rotateY(Math.PI / 2); g.rotateX(Math.PI / 4); g.translate(s * C * .46, H / 2, 0); return g; })]) }; }
    // thatched roof panel: rises from z=+C/2 (eave) to z=-C/2 (ridge)
    { const rise = 1.6, over = .3, sl = Math.hypot(C + over, rise), L = 5, a = []; for (let i = 0; i < L; i++) { const t = i / L, y = rise * t - over * rise / C, zc = C / 2 + over - (C + over) * (t + .5 / L); const p = new THREE.BoxGeometry(C + .02, .1, sl / L + .28); p.rotateX(Math.atan2(rise, C + over) + .07); const uv = p.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 1.1, uv.getY(k) * .5 + i * .3); p.translate(0, y + rise / L * .5 + .08, zc); a.push(p); } G.roof = { thatch: M(a), log: M([logX(C + .1, .1, 0, rise + .02, -C / 2), logX(C + .1, .08, 0, -.1, C / 2 - .1), ...[-1.3, 0, 1.3].map(x => { const g = logX(sl, .06, 0, 0, 0, 6); g.rotateY(Math.PI / 2); g.rotateX(Math.atan2(rise, C + over)); g.translate(x, rise / 2 - .07, -over / 2 + .05); return g; })]) }; }
    { const a = [], rise = 1.6, m = 4; for (let i = 0; i < m; i++) { const y = (i + .5) / m * rise, half = (1 - (i + .5) / m) * C / 2; a.push(logX(half * 2 + .05, rise / m / 2 * 1.05, 0, y, 0)); } G.gable = { log: M(a) }; }
    G.workbench = { plank: M([box(2, .1, .9, 0, .92, 0, 1.2, .5), box(1.8, .06, .7, 0, .28, 0, 1.2, .4), box(1.9, .5, .06, 0, 1.3, -.42, 1.2, .3)]), log: M([[-.9, -.38], [.9, -.38], [-.9, .38], [.9, .38]].map(([x, z]) => logY(.9, .05, x, 0, z))), metal: M([box(.24, .22, .3, -.68, 1.05, .1), box(.05, .4, .05, .5, 1.3, -.37), box(.26, .05, .05, .5, 1.44, -.37), box(.04, .5, .02, .15, 1.3, -.38)]) };
    { const a = []; for (let k = 0; k < 7; k++) { const rr = 1.1 - k * .13; for (let i = 0; i < 10; i++) { if (k < 3 && i >= 8) continue; const an = i / 10 * 6.283 + k * .3, s = .42 - k * .02; const b = new THREE.BoxGeometry(s, .28, .3); b.rotateY(-an); b.translate(Math.cos(an) * rr, .14 + k * .27, Math.sin(an) * rr); a.push(b); } } a.push(box(.5, 1.4, .5, 0, 2.5, 0, .5, 1.5)); G.forge = { stone: M(a), glow: M([box(.9, .5, .25, 1.0 * Math.cos(2.8), .3, 1.0 * Math.sin(2.8))]), metal: M([box(.56, .1, .56, 0, 3.2, 0)]) }; }
    G.bed = { plank: M([box(1.04, .1, 2.1, 0, .32, 0, .6, 1), box(1.04, .55, .08, 0, .5, -1.03, .6, .3)]), log: M([[-.47, -1], [.47, -1], [-.47, 1], [.47, 1]].map(([x, z]) => logY(.3, .05, x, 0, z))), cloth: M([box(.94, .14, 1.96, 0, .44, 0)]), cloth2: M([box(.7, .12, .36, 0, .56, -.74)]) };
    { const a = [], c = new THREE.CylinderGeometry(.48, .36, .9, 12, 1, true); c.translate(0, .45, 0); a.push(c); G.rain = { log: M([c]), cloth: M([(() => { const g = new THREE.CylinderGeometry(.74, .1, .3, 14, 1, true); g.translate(0, 1.1, 0); return g; })()]), metal: M([...[0, 1, 2, 3].map(i => { const an = i * 1.57 + .78, g = logY(1.2, .03, Math.cos(an) * .5, 0, Math.sin(an) * .5); return g; })]), water: M([(() => { const g = new THREE.CylinderGeometry(.42, .42, .02, 14); g.translate(0, .7, 0); return g; })()]) }; }
    { const b = 7.2, d = 5.2, h = 3.4, posts = [[-b / 2, -d / 2], [b / 2, -d / 2], [-b / 2, d / 2], [b / 2, d / 2], [0, -d / 2]]; const roof = new THREE.BoxGeometry(b + 1, .12, d + 1); const uv = roof.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2); roof.rotateX(.09); roof.translate(0, h + .2, 0); G.garage = { log: M([...posts.map(([x, z]) => logY(h + (z < 0 ? .4 : 0), .12, x, 0, z)), logX(b + .4, .1, 0, h, d / 2), logX(b + .4, .1, 0, h + .4, -d / 2)]), thatch: M([roof]), plank: M([box(b, 1.2, .06, 0, 1.4, -d / 2, 3, .5), box(2.2, .08, .7, -1.8, .9, -d / 2 + .4, 1.2, .4), box(2.2, .06, .6, -1.8, .3, -d / 2 + .4, 1.2, .4)]), metal: M([box(.34, .26, .3, -2.4, 1.07, -d / 2 + .4), box(.5, .12, .24, -1.3, 1.0, -d / 2 + .4), box(.04, .6, .04, 1, 1.5, -d / 2 + .1), box(.3, .04, .04, 1, 1.75, -d / 2 + .1), box(.04, .5, .04, 1.6, 1.5, -d / 2 + .1)]) }; }
    G.plot = { soil: M([box(2.2, .16, 2.2, 0, .08, 0, 1.5, 1.5)]), plank: M([box(2.4, .22, .12, 0, .11, 1.16, 1.5, .15), box(2.4, .22, .12, 0, .11, -1.16, 1.5, .15), box(.12, .22, 2.3, 1.16, .11, 0, .15, 1.5), box(.12, .22, 2.3, -1.16, .11, 0, .15, 1.5)]) };
    { // jukung: slim hull with bamboo outriggers
      const hv = [], hu = [], hi = [], ST = 13, RG = 6, L = 7.2; for (let i = 0; i <= ST; i++) { const t = i / ST, z = (t - .5) * L, w = Math.pow(Math.sin(Math.PI * Math.min(.985, t * .94 + .03)), .7) * .46 + .02, lift = Math.pow(Math.abs(t - .5) * 2, 3) * .5, d = .46 * (1 - Math.pow(Math.abs(t - .5) * 2, 4) * .8); for (let k = 0; k <= RG; k++) { const a = k / RG * Math.PI; hv.push(Math.cos(a) * w, lift + .36 - Math.sin(a) * d, z); hu.push(t * 3, k / RG); } }
      for (let i = 0; i < ST; i++) for (let k = 0; k < RG; k++) { const a = i * (RG + 1) + k, b = a + RG + 1; hi.push(a, b, a + 1, a + 1, b, b + 1); }
      const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(hv, 3)); hull.setAttribute('uv', new THREE.Float32BufferAttribute(hu, 2)); hull.setIndex(hi); hull.computeVertexNormals(); const beam = z => logX(4.2, .05, 0, .44, z, 6), oz = (x) => { const g = logX(5.6, .07, 0, 0, 0, 6); g.rotateY(Math.PI / 2); g.translate(x, .12, 0); return g; }, sa = new THREE.BufferGeometry(); sa.setAttribute('position', new THREE.Float32BufferAttribute([0, .9, .9, 0, 4.6, .3, 0, .9, -2.3], 3)); sa.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3)); sa.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, .5, 1, 1, 0], 2));
      G.boat = { plank: M([hull, box(.62, .05, .6, 0, .36, .2, 1, .4), box(.62, .05, .6, 0, .36, -1.1, 1, .4)]), log: M([beam(1.1), beam(-1.1), oz(2.05), oz(-2.05), logY(4, .05, 0, .3, .3)]), sail: M([sa]) };
    }
    return G;
  }
  mesh(k, opts = {}) {
    const root = new THREE.Group(); const def = this.geo[k]; const mat = n => opts.ghost || this.mats[n];
    if (def) for (const [m, g] of Object.entries(def)) { const me = new THREE.Mesh(g, mat(m)); me.castShadow = !opts.ghost; me.receiveShadow = !opts.ghost; root.add(me); }
    if (k === 'doorway') { const d = new THREE.Group(); d.position.set(-.53, .02, 0); for (const [m, g] of Object.entries(this.geo.door)) { const me = new THREE.Mesh(g, mat(m)); me.castShadow = true; d.add(me); } root.add(d); root.userData.door = d; }
    const place = (n, s = 1, y = 0, ry = 0) => { const o = this.glb[n].clone(); if (opts.ghost) o.traverse(c => { if (c.isMesh) c.material = opts.ghost; }); o.scale.setScalar(s); o.position.y = y; o.rotation.y = ry; root.add(o); return o; };
    if (k === 'campfire') place('stone_fire_pit', 1.05);
    if (k === 'chest') place('treasure_chest', 1, 0);
    return root;
  }
  add(s) {
    const o = this.mesh(s.k); o.position.set(s.x, s.y, s.z); o.rotation.y = s.r || 0; this.group.add(o); o.userData.s = s; const rec = { s, o, cols: [], fl: [] }; this.items.set(s.id, rec); this.addColliders(rec); if (s.k === 'campfire' || s.k === 'forge') this.fires.push(rec); if (s.k === 'doorway' && s.open) o.userData.door.rotation.y = 1.7; o.traverse(c => { if (c.isMesh) { c.matrixAutoUpdate = true; } }); return rec;
  }
  remove(id) { const r = this.items.get(id); if (!r) return; this.group.remove(r.o); this.items.delete(id); this.colliders = this.colliders.filter(c => c.rec !== r); this.floors = this.floors.filter(c => c.rec !== r); this.ramps = this.ramps.filter(c => c.rec !== r); this.fires = this.fires.filter(f => f !== r); }
  setDoor(id, open) { const r = this.items.get(id); if (!r) return; r.s.open = open; r.targetDoor = open ? 1.7 : 0; this.colliders.filter(c => c.rec === r && c.door).forEach(c => c.off = !!open); }
  update(dt) { for (const r of this.items.values()) if (r.targetDoor !== undefined) { const d = r.o.userData.door; d.rotation.y += (r.targetDoor - d.rotation.y) * Math.min(1, dt * 7); } }
  addColliders(rec) {
    const s = rec.s, c = Math.cos(s.r || 0), sn = Math.sin(s.r || 0), alongX = Math.abs(c) > .5, addB = (lx0, lx1, ly0, ly1, lz0, lz1, door) => { // local box -> world AABB (right angles only)
      const pts = [[lx0, lz0], [lx1, lz1]].map(([x, z]) => [s.x + x * c + z * sn, s.z - x * sn + z * c]); const b = { x0: Math.min(pts[0][0], pts[1][0]), x1: Math.max(pts[0][0], pts[1][0]), z0: Math.min(pts[0][1], pts[1][1]), z1: Math.max(pts[0][1], pts[1][1]), y0: s.y + ly0, y1: s.y + ly1, rec, door }; this.colliders.push(b); return b; };
    const k = s.k, T = .2; if (k === 'plot') return;
    if (k === 'wall') addB(-C / 2, C / 2, 0, H, -T, T); else if (k === 'window') { addB(-C / 2, -.68, 0, H, -T, T); addB(.68, C / 2, 0, H, -T, T); addB(-C / 2, C / 2, 0, 1.05, -T, T); addB(-C / 2, C / 2, 2, H, -T, T); }
    else if (k === 'doorway') { addB(-C / 2, -.56, 0, H, -T, T); addB(.56, C / 2, 0, H, -T, T); addB(-.56, .56, 2.25, H, -T, T); const d = addB(-.56, .56, 0, 2.25, -.08, .08, true); d.off = !!s.open; }
    else if (k === 'gable') addB(-C / 2 + .7, C / 2 - .7, 0, 1.6, -T, T);
    else if (k === 'foundation' || k === 'floor') { this.floors.push({ x0: s.x - C / 2, x1: s.x + C / 2, z0: s.z - C / 2, z1: s.z + C / 2, y: s.y, rec }); if (k === 'foundation') addB(-C / 2, C / 2, -6, -.22, -C / 2, C / 2); }
    else if (k === 'stair') { const nx = sn, nz = c; this.ramps.push({ x: s.x, z: s.z, y: s.y, r: s.r || 0, rec }); }
    else if (k === 'garage') { for (const [x, z] of [[-3.6, -2.6], [3.6, -2.6], [-3.6, 2.6], [3.6, 2.6]]) addB(x - .15, x + .15, 0, 4, z - .15, z + .15); addB(-3.6, 3.6, 0, 2, -2.68, -2.54); }
    else { const R = BUILD[k]?.r || .6; const w = k === 'workbench' ? 1.05 : k === 'bed' ? .55 : R, d = k === 'workbench' ? .5 : k === 'bed' ? 1.08 : R; addB(-w, w, 0, k === 'forge' ? 3.2 : 1.05, -d, d); }
  }
  // highest walkable surface at or just under a height
  floorAt(x, z, y, step = .55) {
    let best = -1e9; for (const f of this.floors) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1 && f.y <= y + step && f.y > best) best = f.y;
    for (const r of this.ramps) { const c = Math.cos(r.r), s = Math.sin(r.r), dx = x - r.x, dz = z - r.z, lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < C * .5 && Math.abs(lz) < C * .5) { const t = (C / 2 - lz) / C, h = r.y + t * H; if (h <= y + step + .1 && h > best) best = h; } }
    return best;
  }
  collide(x, z, y, height, rad, out) { // pushes a circle out of the AABBs
    let hit = false; for (const b of this.colliders) { if (b.off || y + height < b.y0 || y + .3 > b.y1) continue; const nx = Math.max(b.x0, Math.min(x, b.x1)), nz = Math.max(b.z0, Math.min(z, b.z1)); let dx = x - nx, dz = z - nz, d = dx * dx + dz * dz; if (d < rad * rad) { hit = true; if (d < 1e-6) { const l = x - b.x0, r = b.x1 - x, t = z - b.z0, u = b.z1 - z, m = Math.min(l, r, t, u); if (m === l) x = b.x0 - rad; else if (m === r) x = b.x1 + rad; else if (m === t) z = b.z0 - rad; else z = b.z1 + rad; } else { d = Math.sqrt(d); x = nx + dx / d * rad; z = nz + dz / d * rad; } } } out.x = x; out.z = z; return hit;
  }
}
// ---- snap + ghost placement
export class Placer {
  constructor(structures, world, scene) {
    this.S = structures; this.world = world; this.scene = scene; this.kind = null; this.rot = 0; this.ok = false; this.ghost = null; this.ghostMat = new THREE.MeshStandardMaterial({ color: 0x60ff90, transparent: true, opacity: .42, depthWrite: false, emissive: 0x206a30 }); this.pos = {};
  }
  start(k) { this.stop(); this.kind = k; this.ghost = this.S.mesh(k, { ghost: this.ghostMat }); this.scene.add(this.ghost); }
  stop() { if (this.ghost) this.scene.remove(this.ghost); this.ghost = null; this.kind = null; }
  rotate() { this.rot = (this.rot + 1) % 4; }
  foundationAt(cx, cz) { for (const r of this.S.items.values()) if (r.s.k === 'foundation' && Math.round(r.s.x / C) === cx && Math.round(r.s.z / C) === cz) return r.s; return null; }
  update(pos, dir) {
    if (!this.ghost) return; const k = this.kind, b = BUILD[k], w = this.world; let t = 1, hit = null; // march the view ray to the ground / a floor
    const reach = b.kind === 'water' ? 14 : 7; for (t = .5; t < reach; t += .25) { const x = pos.x + dir.x * t, y = pos.y + dir.y * t, z = pos.z + dir.z * t; const g = Math.max(w.height(x, z), this.S.floorAt(x, z, y, .1)); if (y <= g) { hit = { x, y: g, z }; break; } } if (!hit) { const x = pos.x + dir.x * 5, z = pos.z + dir.z * 5; hit = { x, y: pos.y + dir.y * 5, z }; }
    let ok = false, px = hit.x, py = hit.y, pz = hit.z, r = this.rot * Math.PI / 2, key = null; const cx = Math.round(hit.x / C), cz = Math.round(hit.z / C), ccx = cx * C, ccz = cz * C, F = this.foundationAt(cx, cz);
    const neigh = (a, c) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([i, j]) => this.foundationAt(a + i, c + j)).find(Boolean);
    const fbase = neigh(cx, cz), level = fbase ? Math.max(0, Math.round((pos.y + dir.y * 4 - fbase.y - 1.2) / H)) : 0;
    if (b.kind === 'cell' && k === 'foundation') { const near = neigh(cx, cz); let y = near ? near.y : Math.round((Math.max(w.height(ccx, ccz), w.height(ccx - 1.4, ccz - 1.4), w.height(ccx + 1.4, ccz + 1.4), w.height(ccx + 1.4, ccz - 1.4), w.height(ccx - 1.4, ccz + 1.4)) + .32) * 4) / 4; px = ccx; pz = ccz; py = y; key = `f${cx},${cz}`; r = 0; ok = !F && y > .5 && y - w.height(ccx, ccz) < 3.2; }
    else if (k === 'stair') { px = ccx; pz = ccz; ok = !!F; py = F ? F.y + level * H : hit.y; key = `st${cx},${cz},${level}`; }
    else if (b.kind === 'edge' || b.kind === 'edge2') { const dx = hit.x - ccx, dz = hit.z - ccz, ew = Math.abs(dx) > Math.abs(dz), sx = ew ? Math.sign(dx) || 1 : 0, sz = ew ? 0 : Math.sign(dz) || 1; px = ccx + sx * C / 2; pz = ccz + sz * C / 2; r = ew ? Math.PI / 2 : 0; const a = this.foundationAt(cx, cz) || this.foundationAt(cx + sx, cz + sz); ok = !!a; py = a ? a.y + level * H : hit.y; key = `e${cx * 2 + sx},${cz * 2 + sz},${level}`; }
    else if (b.kind === 'cell2') { px = ccx; pz = ccz; const f2 = neigh(cx, cz), lv = Math.max(1, level); ok = !!f2; py = f2 ? f2.y + lv * H : hit.y; key = `c${cx},${cz},${lv}`; }
    else if (b.kind === 'roof') { px = ccx; pz = ccz; const f2 = neigh(cx, cz), lv = Math.max(1, level); ok = !!f2; py = f2 ? f2.y + lv * H : hit.y; key = `r${cx},${cz},${lv}`; }
    else if (b.kind === 'water') { const lv = w.waterLevel(hit.x, hit.z); ok = lv !== null && lv - w.height(hit.x, hit.z) > .6; py = (lv ?? 0) + .06; }
    else { const fy = this.S.floorAt(hit.x, hit.z, hit.y + .1, .3); py = Math.max(hit.y, fy); const dry = w.waterLevel(hit.x, hit.z) === null; const dd = Math.hypot(hit.x - pos.x, hit.z - pos.z); ok = dry && dd > (k === 'garage' ? 4 : 1.2) && (py > fy - .01 || w.normal(hit.x, hit.z)[1] > .85); }
    if (key && [...this.S.items.values()].some(i => i.s.key === key)) ok = false;
    this.ok = ok; this.pos = { x: px, y: py, z: pz, r, key }; this.ghost.position.set(px, py, pz); this.ghost.rotation.y = r; this.ghostMat.color.set(ok ? 0x60ff90 : 0xff5040); this.ghostMat.emissive.set(ok ? 0x206a30 : 0x6a2018);
  }
}
