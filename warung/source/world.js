// ===== Dunia 3D: satu jalan kampung, kamera isometrik =====
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ITEMS, IKEYS, HOUSES, PLACES, LANE_Z, METER, COUNTER, INSIDE, capOf, isUnlocked } from './data.js';

export const PCOLORS = [0xd8372b, 0x2f6fd6, 0x23a35a, 0xf2a31b, 0x8e5bd6, 0xe0558f];
const SKINS = [0xe8b98a, 0xd9a273, 0xc68642, 0x9a6233, 0xf0c9a0];
const SHIRTS = [0xe96d5b, 0x5b8fe9, 0x6cc48a, 0xf4c95d, 0xb084e0, 0xf29e6d, 0x4fb8c4, 0xe7e2d6, 0xd65c8f, 0x7f8c4f, 0xffffff];
const HAIRS = [0x1b1410, 0x2e1e14, 0x3b2a1e, 0x111111];
const PASTEL = [0xd99aa6, 0x86b9d6, 0xb7a6e6, 0xe6cf92, 0x96cfb6, 0xe8a57a, 0x6f9fc0, 0xd893b0, 0xf2f0e6, 0x3d4a5c];
const SARUNG = [0x3e5a8a, 0x6b3b3b, 0x2e5d4b, 0x5a4a7a, 0x7a5a2e];

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function M(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const CYL6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
const SPH = new THREE.IcosahedronGeometry(0.5, 2);
const SPHL = new THREE.IcosahedronGeometry(0.5, 1);
const CONE4 = new THREE.ConeGeometry(0.5, 1, 4);
const CONE8 = new THREE.ConeGeometry(0.5, 1, 8);
const _col = new THREE.Color();
class Batch {
  constructor() { this.g = []; }
  add(geo, color, m) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (m) g.applyMatrix4(m);
    _col.set(color);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = _col.r; a[i * 3 + 1] = _col.g; a[i * 3 + 2] = _col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.g.push(g);
    return this;
  }
  box(w, h, d, c, x, y, z, ry = 0) { return this.add(BOX, c, M(x, y, z, ry, w, h, d)); }
  geo() { const g = mergeGeometries(this.g); this.g = []; return g; }
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData.redraw = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  return t;
}

export function createWorld(canvas) {
  const mobile = matchMedia('(pointer:coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.7 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const sky = new THREE.Color(0xa9d8f5);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 55, 110);
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 220);
  const hemi = new THREE.HemisphereLight(0xdcefff, 0x8a6b4a, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b5, 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 100 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const lamp = new THREE.PointLight(0xffc874, 0, 14, 1.4); lamp.position.set(0, 2.6, -1.4); scene.add(lamp);

  const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
  const VCf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o })); return mats.get(k); };
  const add = (b, m = VC, cast = true, recv = true) => { const me = new THREE.Mesh(b.geo(), m); me.castShadow = cast; me.receiveShadow = recv; scene.add(me); return me; };

  // ---------- Tekstur ----------
  const tileTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d7b39c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#d2a98f' : '#dcbba5'; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
    g.fillStyle = 'rgba(120,80,60,.25)'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 1, 0, 2, h); g.fillRect(0, i * 64 - 1, w, 2); }
  });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(80, 1.2);
  const asphTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b4e55'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { const v = 60 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v + 6},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  asphTex.wrapS = asphTex.wrapT = THREE.RepeatWrapping; asphTex.repeat.set(30, 2);
  const roofTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b5532f'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) {
      const x = c * 32 - (r % 2) * 16, y = r * 32;
      const grd = g.createLinearGradient(0, y, 0, y + 32); grd.addColorStop(0, '#cf6a3d'); grd.addColorStop(1, '#963b20');
      g.fillStyle = grd; g.beginPath(); g.ellipse(x + 16, y + 18, 15, 16, 0, 0, Math.PI); g.fill();
    }
  });
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping; roofTex.repeat.set(3, 2);
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.75, side: THREE.DoubleSide });
  const slateTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#3e4a5e'; g.fillRect(0, 0, w, h); g.fillStyle = '#334055'; for (let r = 0; r < 8; r++) g.fillRect(0, r * 16 + 12, w, 4); });
  slateTex.wrapS = slateTex.wrapT = THREE.RepeatWrapping; slateTex.repeat.set(3, 2);
  const slateMat = new THREE.MeshStandardMaterial({ map: slateTex, roughness: 0.7, side: THREE.DoubleSide });
  const gedekTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c9a26a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { g.fillStyle = (i + j) % 2 ? '#b88d55' : '#d6b37c'; g.fillRect(i * 8, j * 8, 8, 4); }
  });
  gedekTex.wrapS = gedekTex.wrapT = THREE.RepeatWrapping; gedekTex.repeat.set(4, 2);

  // ---------- Tanah, trotoar, jalan ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), mat(0x7fae55)); ground.rotation.x = -Math.PI / 2; ground.position.z = -20; ground.receiveShadow = true; scene.add(ground);
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(170, 0.18, 2.3), new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.9 }));
  walkway.position.set(0, 0.09, 1.5); walkway.receiveShadow = true; scene.add(walkway);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(170, 7.4), new THREE.MeshStandardMaterial({ map: asphTex, roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, 6.6); road.receiveShadow = true; scene.add(road);
  const sb = new Batch();
  for (let x = -85; x < 85; x += 1) sb.box(1, 0.22, 0.3, (x & 1) ? 0x1f1f22 : 0xf1f1ea, x + 0.5, 0.11, 2.78);
  for (let x = -84; x < 84; x += 5) sb.box(2.6, 0.03, 0.16, 0xf2f2ea, x, 0.04, 6.6);
  sb.box(170, 0.03, 0.12, 0xe8e8dd, 0, 0.04, 9.9);
  for (const zx of [-15, 21, -42]) for (let i = 0; i < 7; i++) sb.box(0.7, 0.03, 6.6, 0xf2f2ea, zx + i * 1.25, 0.04, 6.6);
  sb.box(170, 0.15, 2.4, 0x6d9a48, 0, 0.0, 11.4);
  for (let x = -80; x <= 80; x += 16) sb.add(CYL6, 0x6b6157, M(x, 3.6, 10.6, 0, 0.26, 7.2, 0.26)).box(1.8, 0.14, 0.14, 0x4a433c, x, 6.8, 10.6).box(0.1, 0.25, 0.1, 0xdddddd, x - 0.7, 6.95, 10.6).box(0.1, 0.25, 0.1, 0xdddddd, x + 0.7, 6.95, 10.6);
  add(sb, VC, true, true);
  {
    const pts = [];
    for (let x = -80; x < 80; x += 16) for (const off of [-0.7, 0, 0.7]) for (let i = 0; i < 12; i++) {
      const a = i / 12, b = (i + 1) / 12; const sag = q => 6.95 - Math.sin(q * Math.PI) * 0.7;
      pts.push(new THREE.Vector3(x + a * 16, sag(a), 10.6 + off * 0.1), new THREE.Vector3(x + b * 16, sag(b), 10.6 + off * 0.1));
    }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x222222 })));
  }

  // ---------- Pagar + tanaman ----------
  const fence = new Batch(), plants = new Batch();
  const CREAM = 0xeee3cf, PILLAR = 0xe4d6bd, IRON = 0x1e2024, GREEN1 = 0x3f8f3a, GREEN2 = 0x5aa845, GREEN3 = 0x2f7a35;
  function fenceRun(x0, x1, gate) {
    for (let x = x0; x <= x1 + 0.01; x += 3) fence.box(0.5, 1.6, 0.5, PILLAR, x, 0.8, 0.2).box(0.62, 0.14, 0.62, 0xd8cab0, x, 1.66, 0.2);
    for (let x = x0; x < x1 - 0.01; x += 3) {
      const mid = x + 1.5;
      if (gate !== undefined && Math.abs(mid - gate) < 1.6) {
        for (let k = -1.2; k <= 1.2; k += 0.18) fence.box(0.06, 1.5, 0.06, IRON, mid + k, 0.75, 0.2);
        fence.box(2.6, 0.08, 0.08, IRON, mid, 1.45, 0.2).box(2.6, 0.08, 0.08, IRON, mid, 0.2, 0.2);
      } else {
        fence.box(2.5, 0.5, 0.3, CREAM, mid, 0.25, 0.2);
        for (let k = -1.1; k <= 1.1; k += 0.22) fence.box(0.05, 0.9, 0.05, IRON, mid + k, 0.95, 0.2);
        fence.box(2.5, 0.06, 0.06, IRON, mid, 1.38, 0.2);
        plants.add(SPHL, GREEN2, M(mid - 0.6, 0.9, -0.25, 0, 0.9, 0.8, 0.7)).add(SPHL, GREEN1, M(mid + 0.5, 0.8, -0.3, 1, 0.8, 0.7, 0.6));
      }
    }
  }
  function pot(x, z, s = 1) { plants.add(CYL, 0x5a5550, M(x, 0.22 * s, z, 0, 0.42 * s, 0.44 * s, 0.42 * s)).add(SPHL, GREEN2, M(x, 0.62 * s, z, x, 0.6 * s, 0.55 * s, 0.6 * s)); }
  function banana(x, z, s = 1) {
    plants.add(CYL6, 0x7a8f3a, M(x, 1.1 * s, z, 0, 0.22 * s, 2.2 * s, 0.22 * s));
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + x; plants.add(BOX, i % 2 ? GREEN2 : GREEN1, M(x + Math.sin(a) * 0.7 * s, 2.3 * s, z + Math.cos(a) * 0.7 * s, a, 0.5 * s, 0.05, 1.6 * s, 0.5, 0)); }
  }
  function tree(x, z, s = 1) {
    plants.add(CYL6, 0x6b4f35, M(x, 1.3 * s, z, 0, 0.3 * s, 2.6 * s, 0.3 * s));
    plants.add(SPHL, GREEN3, M(x, 3.2 * s, z, x, 2.6 * s, 2.2 * s, 2.6 * s)).add(SPHL, GREEN2, M(x + 0.7 * s, 3.8 * s, z + 0.4, x, 1.8 * s, 1.5 * s, 1.8 * s)).add(SPHL, GREEN1, M(x - 0.8 * s, 2.9 * s, z + 0.6, x, 1.6 * s, 1.3 * s, 1.6 * s));
  }

  // ---------- Rumah warga ----------
  const houseMeshes = [];
  for (const k in HOUSES) {
    const H = HOUSES[k];
    const b = new Batch();
    const W = H.w, D = 5.6, z0 = -3.2, cz = z0 - D / 2, h = H.two ? 5.6 : 3.2;
    b.box(W, 0.3, D + 2.4, 0xcfc3ad, H.x, 0.15, cz + 1.2);
    b.box(W - 0.4, h, D, H.col, H.x, h / 2 + 0.3, cz);
    b.box(W - 0.3, 0.5, D + 0.1, 0x9b8d78, H.x, 0.55, cz);
    const wy = 1.9;
    b.box(1.2, 2.1, 0.1, 0x6b4428, H.x - 0.2, 1.35, z0 + 0.03).box(1.0, 1.9, 0.12, 0x8a5a33, H.x - 0.2, 1.3, z0 + 0.05);
    for (const s of [-1, 1]) { const wx = H.x + s * (W / 2 - 1.6); b.box(1.6, 1.2, 0.1, 0xdcefff, wx, wy, z0 + 0.04).box(1.8, 0.12, 0.16, 0x7a5a3a, wx, wy - 0.66, z0 + 0.06).box(0.08, 1.2, 0.12, 0x7a5a3a, wx, wy, z0 + 0.07); }
    if (H.two) {
      b.box(W - 0.4, 0.25, 1.6, 0xd8cdb8, H.x, 3.4, z0 + 0.7);
      for (let i = -W / 2 + 0.8; i < W / 2 - 0.4; i += 0.3) b.box(0.05, 0.8, 0.05, IRON, H.x + i, 3.9, z0 + 1.45);
      b.box(W - 0.6, 0.07, 0.07, IRON, H.x, 4.3, z0 + 1.45);
      for (const s of [-1, 1]) b.box(1.4, 1.3, 0.1, 0xdcefff, H.x + s * (W / 2 - 1.8), 4.4, z0 + 0.04).box(1.6, 1.5, 0.08, 0x7a5a3a, H.x + s * (W / 2 - 1.8), 4.4, z0 + 0.02);
    }
    b.box(W * 0.6, 0.12, 1.6, 0x8a3a22, H.x - 0.2, 2.75, z0 + 0.75).box(0.18, 2.5, 0.18, 0xe8dcc4, H.x - W * 0.28, 1.4, z0 + 1.45).box(0.18, 2.5, 0.18, 0xe8dcc4, H.x + W * 0.24, 1.4, z0 + 1.45);
    const m = new THREE.Mesh(b.geo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, transparent: true }));
    m.castShadow = m.receiveShadow = true; scene.add(m);
    const slate = H.roof === 0x3d4f6b || H.roof === 0x6b4a8a;
    const rmat = (slate ? slateMat : roofMat).clone(); rmat.transparent = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1, false, Math.PI / 4), rmat);
    roof.scale.set((W + 1.2) / Math.SQRT2, 2.0, (D + 1.4) / Math.SQRT2); roof.position.set(H.x, h + 1.3, cz); roof.castShadow = true; scene.add(roof);
    houseMeshes.push({ m, roof });
    fenceRun(H.x - W / 2 - 0.2, H.x + W / 2 + 0.2, H.x + 1.2);
    banana(H.x + W / 2 - 0.6, -1.4, 0.9); pot(H.x - W / 2 + 0.8, -0.6); pot(H.x + 0.2, -0.5, 0.8);
  }
  fenceRun(-66, -64.2); tree(-42, -7, 1.1); tree(-54, -8, 1); tree(-30, -8.5, 1.2); tree(-17.5, -7.5, 0.9); tree(-64, -6, 1.2);

  // ---------- Masjid ----------
  {
    const b = new Batch();
    const x = 15.5, W = 10, D = 7, z0 = -2.6, cz = z0 - D / 2;
    b.box(W + 2, 0.3, D + 2.2, 0xd9d2c2, x, 0.15, cz + 1);
    b.box(W, 3.6, D, 0xf6f2e6, x, 2.1, cz).box(W + 0.3, 0.35, D + 0.3, 0x23935a, x, 4.05, cz).box(W, 0.45, 0.12, 0x23935a, x, 0.5, z0 + 0.02);
    for (let i = -3; i <= 3; i += 1.5) { b.box(1.0, 2.0, 0.12, 0x1f7a4a, x + i, 1.7, z0 + 0.04); b.add(CYL, 0x1f7a4a, M(x + i, 2.7, z0 + 0.05, 0, 1.0, 0.12, 1.0, Math.PI / 2, 0)); }
    b.add(SPH, 0x1f8a55, M(x, 4.2, cz, 0, 4.8, 4.2, 4.8)).add(CYL6, 0xd4af37, M(x, 6.6, cz, 0, 0.1, 0.9, 0.1)).add(SPH, 0xd4af37, M(x, 7.1, cz, 0, 0.28, 0.28, 0.28));
    const mx = x + W / 2 + 1.5;
    b.box(1.6, 8.5, 1.6, 0xf6f2e6, mx, 4.25, z0 - 0.6).box(2.0, 0.3, 2.0, 0x23935a, mx, 6.8, z0 - 0.6).box(1.3, 1.2, 1.3, 0xf6f2e6, mx, 7.6, z0 - 0.6);
    for (let i = 0; i < 4; i++) b.box(0.3, 0.9, 0.06, 0x1f7a4a, mx - 0.4 + i * 0.27, 7.6, z0 + 0.06);
    b.add(SPH, 0x1f8a55, M(mx, 8.5, z0 - 0.6, 0, 1.4, 1.3, 1.4)).add(CYL6, 0xd4af37, M(mx, 9.4, z0 - 0.6, 0, 0.06, 0.6, 0.06));
    for (let px = x - W / 2 - 1; px <= x + W / 2 + 2.4; px += 2) b.box(0.45, 1.5, 0.45, 0xf6f2e6, px, 0.75, 0.2).add(CONE4, 0x23935a, M(px, 1.65, 0.2, Math.PI / 4, 0.55, 0.35, 0.55));
    for (let px = x - W / 2; px <= x + W / 2 + 1.4; px += 2) { if (Math.abs(px - x) < 1.2) continue; b.box(1.5, 0.5, 0.25, 0xf6f2e6, px, 0.25, 0.2); for (let k = -0.6; k <= 0.6; k += 0.2) b.box(0.05, 0.8, 0.05, 0x23935a, px + k, 0.9, 0.2); }
    add(b);
    banana(x - W / 2 - 1.6, -1.2, 1);
  }
  {
    const b = new Batch(), x = PLACES.pos.x;
    b.box(2.6, 0.5, 2.0, 0x8a6a40, x, 0.6, -1.2);
    for (const dx of [-1.2, 1.2]) for (const dz of [-0.4, -2.0]) b.box(0.15, 2.4, 0.15, 0x6b4f2e, x + dx, 1.2, dz);
    b.add(CONE4, 0x9a7a4a, M(x, 2.8, -1.2, Math.PI / 4, 4.0, 1.0, 3.2)).add(CYL, 0x7a5030, M(x + 1.25, 1.6, -0.4, 0, 0.18, 0.8, 0.18));
    add(b);
  }
  const megaGlass = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.2, metalness: 0.1, emissive: 0x000000 });
  const megaSign = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#1d4fd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd400'; g.fillRect(0, h - 16, w, 16);
    g.fillStyle = '#ffffff'; g.font = '800 80px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MEGAMART', w / 2, h / 2 - 6);
  });
  {
    const x = PLACES.megamart.x, W = 11, D = 8, z0 = -2.4, cz = z0 - D / 2;
    const b = new Batch();
    b.box(W + 2, 0.2, D + 2.6, 0x9aa0a8, x, 0.1, cz + 1.2).box(W, 4.4, D, 0xf4f6f8, x, 2.3, cz).box(W + 0.4, 0.5, D + 0.4, 0x1d4fd8, x, 4.6, cz).box(W + 0.2, 0.3, D + 0.2, 0xe23b3b, x, 4.15, cz);
    for (const s of [-1, 1]) b.box(0.4, 3.6, 0.4, 0xd7dce2, x + s * (W / 2 - 0.2), 1.9, z0 + 0.1);
    add(b);
    const gl = new THREE.Mesh(BOX, megaGlass); gl.scale.set(W - 1.2, 2.8, 0.1); gl.position.set(x, 1.7, z0 + 0.06); scene.add(gl);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: megaSign, toneMapped: false })); sg.position.set(x, 5.8, z0 - 0.5); scene.add(sg);
  }
  {
    const b = new Batch(), x0 = 43, x1 = 72;
    b.box(x1 - x0, 0.05, 22, 0x6fae9c, (x0 + x1) / 2, 0.02, -12);
    for (let x = x0; x <= x1; x += 6) b.box(0.4, 0.25, 22, 0x8b6b45, x, 0.12, -12);
    for (let z = -23; z <= -1; z += 5.5) b.box(x1 - x0, 0.25, 0.4, 0x8b6b45, (x0 + x1) / 2, 0.12, z);
    b.box(2.6, 0.2, 2.6, 0x9a7444, 56, 1.1, -6).add(CONE4, 0xd9b15c, M(56, 2.6, -6, Math.PI / 4, 3.8, 1.2, 3.8));
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) b.box(0.15, 2.2, 0.15, 0x7a5634, 56 + dx, 0.9, -6 + dz);
    b.box(0.1, 1.8, 0.1, 0x6b4a2b, 64, 0.9, -9).box(1.4, 0.1, 0.1, 0x6b4a2b, 64, 1.4, -9).box(0.6, 0.7, 0.3, 0xc24a3a, 64, 1.35, -9).add(SPH, 0xe8c37a, M(64, 1.95, -9, 0, 0.45, 0.45, 0.45)).add(CONE8, 0xd9b15c, M(64, 2.25, -9, 0, 0.8, 0.3, 0.8));
    add(b);
    const g = new THREE.ConeGeometry(0.13, 0.55, 4); const pts = [];
    for (let x = x0 + 0.5; x < x1; x += 0.8) for (let z = -22.5; z < -1.2; z += 0.8) { if (((x - x0) % 6) < 0.6 || ((z + 23) % 5.5) < 0.6) continue; pts.push([x, z]); }
    const im = new THREE.InstancedMesh(g, mat(0x6fb63e), pts.length);
    pts.forEach(([x, z], i) => im.setMatrixAt(i, M(x, 0.28, z, x * z, 1, 0.9 + ((x * 3 + z * 7) % 1 + 1) % 1 * 0.4, 1)));
    im.receiveShadow = true; scene.add(im);
    fenceRun(40, 43);
  }
  for (const [x, z, s] of [[-6.5, -6, 1.1], [7, -6.5, 1.0], [26, -6, 1.2], [42, -5, 1.1], [-20, -9, 1], [3, -9, 1.3], [74, -5, 1.2], [-70, -8, 1.1]]) tree(x, z, s);
  for (const x of [-7.4, 6.2, 8.4, 22.5, 41.2]) pot(x, -0.4, 1);
  fenceRun(5.4, 9.6); fenceRun(-10.2, -5.4); fenceRun(22.6, 28.6);
  add(fence); add(plants, VCf);

  // ---------- Warung ----------
  const WOOD = 0xa86f43, DWOOD = 0x6f4528, ORANGE = 0xc8642c;
  const wb = new Batch();
  wb.box(9.6, 0.32, 4.2, 0xe5d9c6, 0, 0.16, -1.5);
  wb.box(9.6, 0.06, 0.1, 0xb8a990, 0, 0.33, 0.6);
  for (const s of [-1, 1]) wb.box(0.22, 3.0, 0.22, DWOOD, s * 4.6, 1.5, 0.3).box(0.22, 3.4, 0.22, DWOOD, s * 4.6, 1.7, -3.5);
  for (const sx of [-2.6, 0, 2.6]) { wb.box(2.4, 2.6, 0.08, DWOOD, sx, 1.6, -3.3); for (const y of [0.62, 1.22, 1.82, 2.42]) wb.box(2.4, 0.06, 0.6, WOOD, sx, y, -3.0); wb.box(0.06, 2.6, 0.6, DWOOD, sx - 1.2, 1.6, -3.0).box(0.06, 2.6, 0.6, DWOOD, sx + 1.2, 1.6, -3.0); }
  wb.box(5.8, 0.9, 0.9, 0x7a4a2a, 0, 0.77, 0.45).box(6.0, 0.1, 1.0, ORANGE, 0, 1.73, 0.45).box(5.9, 0.06, 0.95, 0x5a3a22, 0, 1.25, 0.45);
  const ECOL = [0xe8463a, 0xf2c230, 0x2f7fe0, 0x23a35a, 0xf06aa8, 0xf2a31b, 0xffffff];
  for (let i = 0; i < 22; i++) wb.box(0.2, 0.22 + (i % 3) * 0.04, 0.18, ECOL[i % ECOL.length], -2.6 + i * 0.25, 1.42, 0.25 + (i % 2) * 0.35);
  for (let i = 0; i < 22; i++) wb.box(0.2, 0.2, 0.2, ECOL[(i + 3) % ECOL.length], -2.6 + i * 0.25, 0.95, 0.3 + (i % 2) * 0.3);
  for (let i = 0; i < 3; i++) { wb.add(CYL, 0x5aa9e6, M(3.4 + (i % 2) * 0.45, 0.62, -2.6 + i * 0.5, 0, 0.42, 0.55, 0.42)); wb.add(CYL, 0x3a83c8, M(3.4 + (i % 2) * 0.45, 0.94, -2.6 + i * 0.5, 0, 0.14, 0.1, 0.14)); }
  for (let i = 0; i < 4; i++) wb.add(CYL, 0x41b35c, M(3.2 + (i % 2) * 0.42, 0.62, -1.0 + Math.floor(i / 2) * 0.45, 0, 0.36, 0.55, 0.36)).add(CYL, 0x2f8a45, M(3.2 + (i % 2) * 0.42, 0.95, -1.0 + Math.floor(i / 2) * 0.45, 0, 0.18, 0.12, 0.18));
  const RC = [0xe6463c, 0xf2c230, 0x2a62c9, 0x23a35a, 0xf06aa8, 0xffffff];
  for (let i = 0; i < 12; i++) { const x = -3.8 + i * 0.68; wb.box(0.2, 0.6, 0.03, RC[i % RC.length], x, 2.95, -2.55); for (let j = 0; j < 3; j++) wb.box(0.22, 0.02, 0.035, 0xffffff, x, 2.75 + j * 0.18, -2.54); }
  wb.box(9.0, 0.05, 0.05, 0x555555, 0, 3.27, -2.55);
  wb.box(0.12, 2.6, 0.12, DWOOD, -4.2, 1.3, 1.4).box(0.12, 2.6, 0.12, DWOOD, -2.9, 1.3, 1.4);
  wb.box(0.3, 2.2, 0.3, 0x7a8088, METER.x, 1.1, 0.25).box(0.55, 0.7, 0.3, 0xaab2bb, METER.x, 1.75, 0.45).box(0.4, 0.2, 0.05, 0x222222, METER.x, 1.85, 0.61);
  { const m = new THREE.Mesh(wb.geo(), VC); m.castShadow = m.receiveShadow = true; scene.add(m); }
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.4, 0.12), new THREE.MeshStandardMaterial({ map: gedekTex, roughness: 0.9 }));
  backWall.position.set(0, 1.85, -3.55); backWall.receiveShadow = true; scene.add(backWall);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.2, 0.12), backWall.material); sideL.rotation.y = Math.PI / 2; sideL.position.set(-4.7, 1.75, -1.6); scene.add(sideL);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd6f0ff, transparent: true, opacity: 0.28, roughness: 0.05 });
  const glass = new THREE.Mesh(BOX, glassMat); glass.scale.set(5.8, 0.8, 0.95); glass.position.set(0, 1.3, 0.45); scene.add(glass);
  const fridge = new THREE.Group();
  { const bd = new THREE.Mesh(BOX, mat(0xd7263d)); bd.scale.set(1.1, 2.3, 0.9); bd.position.y = 1.47; bd.castShadow = true; fridge.add(bd);
    const dr = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.1, emissive: 0x000000 })); dr.scale.set(0.9, 1.7, 0.05); dr.position.set(0, 1.4, 0.46); fridge.add(dr); fridge.userData.door = dr;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const bt = new THREE.Mesh(CYL, mat([0xd98b2b, 0x8fd0ff, 0xd7263d, 0x23a35a][(r + c) % 4])); bt.scale.set(0.14, 0.3, 0.14); bt.position.set(-0.32 + c * 0.21, 0.78 + r * 0.42, 0.3); fridge.add(bt); }
    const tp = new THREE.Mesh(BOX, mat(0xffffff)); tp.scale.set(1.12, 0.3, 0.92); tp.position.y = 2.6; fridge.add(tp); }
  fridge.position.set(-3.7, 0, -1.6); fridge.rotation.y = 0.5; scene.add(fridge);
  const wRoofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.75, side: THREE.DoubleSide, transparent: true });
  const wRoof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.12, 5.6), wRoofMat);
  wRoof.position.set(0, 3.35, -1.4); wRoof.rotation.x = 0.2; wRoof.castShadow = true; scene.add(wRoof);
  const ridge = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: 0x8a3a22, transparent: true })); ridge.scale.set(10.6, 0.25, 0.3); ridge.position.set(0, 3.9, -4.0); scene.add(ridge);
  let signText = ['WARUNG', 'KOMPAK', 'sedia pulsa & token'];
  const signTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d7263d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(12, 12, w - 24, h - 24); g.fillStyle = '#d7263d'; g.fillRect(24, 24, w - 48, h - 48);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
    g.font = '800 118px "Baloo 2", system-ui, sans-serif'; g.fillText(signText[0], w / 2, 130);
    g.fillStyle = '#ffe9a8'; g.fillRect(50, 220, w - 100, 150); g.fillStyle = '#b3141f'; g.font = '800 104px "Baloo 2", system-ui, sans-serif'; g.fillText(signText[1], w / 2, 300);
    g.fillStyle = '#ffffff'; g.font = '700 40px "Baloo 2", system-ui, sans-serif'; g.fillText(signText[2], w / 2, 430);
  });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0, roughness: 0.6 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.08), signMat); sign.position.set(-3.55, 2.15, 1.45); sign.castShadow = true; scene.add(sign);
  document.fonts && document.fonts.ready.then(() => { signTex.userData.redraw(); megaSign.userData.redraw(); });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6d6, emissive: 0x000000 });
  const bulb = new THREE.Mesh(SPHL, bulbMat); bulb.scale.setScalar(0.22); bulb.position.set(0, 2.8, -1.2); scene.add(bulb);
  const meterLed = new THREE.Mesh(SPHL, new THREE.MeshBasicMaterial({ color: 0x33ff66 })); meterLed.scale.setScalar(0.1); meterLed.position.set(METER.x + 0.15, 2.0, 0.62); scene.add(meterLed);

  const shelfVis = {};
  {
    const keys = IKEYS.filter(k => !ITEMS[k].digital && !['gas', 'galon'].includes(k));
    keys.forEach((k, i) => {
      const col = i % 6, row = Math.floor(i / 6);
      const bx = -3.6 + col * 1.3 + (row % 2) * 0.2, by = 0.68 + (row % 4) * 0.6, bz = -3.0;
      const g = new THREE.Group(); scene.add(g);
      const items = [];
      const tall = ['air', 'teh', 'soda', 'minyak'].includes(k);
      for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(k === 'telur' ? SPHL : tall ? CYL : BOX, mat(ITEMS[k].col)); m.scale.set(0.24, tall ? 0.42 : 0.3, 0.24); m.position.set(bx + j * 0.27, by + (tall ? 0.22 : 0.16), bz + (j % 2) * 0.12); m.castShadow = true; g.add(m); items.push(m); }
      shelfVis[k] = { g, items };
    });
  }
  const upg = {};
  {
    const fan = new THREE.Group(); const st = new THREE.Mesh(CYL, mat(0xdddddd)); st.scale.set(0.06, 1.4, 0.06); st.position.y = 0.9; fan.add(st);
    const base = new THREE.Mesh(CYL, mat(0x2a62c9)); base.scale.set(0.5, 0.06, 0.5); base.position.y = 0.36; fan.add(base);
    const head = new THREE.Group(); head.position.set(0, 1.65, 0.05);
    head.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 20), mat(0xdddddd)));
    const blades = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(BOX, mat(0x6fb0e0)); b.scale.set(0.12, 0.28, 0.02); b.position.y = 0.14; const p = new THREE.Group(); p.rotation.z = i * 2.094; p.add(b); blades.add(p); }
    head.add(blades); fan.add(head); fan.position.set(2.6, 0, -0.4); fan.rotation.y = -0.6; scene.add(fan); upg.kipas = fan; fan.userData.blades = blades;
    const radio = new THREE.Group(); const rb = new THREE.Mesh(BOX, mat(0x3a3a3a)); rb.scale.set(0.55, 0.3, 0.22); radio.add(rb);
    for (const s of [-1, 1]) { const sp = new THREE.Mesh(CYL, mat(0x888888)); sp.scale.set(0.15, 0.03, 0.15); sp.rotation.x = Math.PI / 2; sp.position.set(s * 0.15, 0, 0.12); radio.add(sp); }
    radio.position.set(1.8, 1.93, 0.4); scene.add(radio); upg.radio = radio;
    const qr = new THREE.Group(); const qb = new THREE.Mesh(BOX, mat(0xffffff)); qb.scale.set(0.32, 0.42, 0.04); qr.add(qb); const qc = new THREE.Mesh(BOX, mat(0x111111)); qc.scale.set(0.22, 0.22, 0.05); qr.add(qc);
    qr.position.set(-1.6, 2.0, 0.5); qr.rotation.x = -0.3; scene.add(qr); upg.qris = qr;
    const kul = new THREE.Group(); const kb = new THREE.Mesh(BOX, mat(0xf4f6f8)); kb.scale.set(0.9, 1.9, 0.8); kb.position.y = 1.27; kb.castShadow = true; kul.add(kb);
    const kd = new THREE.Mesh(BOX, glassMat); kd.scale.set(0.8, 1.6, 0.04); kd.position.set(0, 1.3, 0.42); kul.add(kd);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const bt = new THREE.Mesh(CYL, mat(0xd7263d)); bt.scale.set(0.14, 0.3, 0.14); bt.position.set(-0.25 + c * 0.25, 0.75 + r * 0.45, 0.25); kul.add(bt); }
    kul.position.set(-2.4, 0, -2.4); scene.add(kul); upg.kulkas = kul;
    const fr = new THREE.Group(); const fb = new THREE.Mesh(BOX, mat(0xf4f6f8)); fb.scale.set(1.3, 0.9, 0.7); fb.position.y = 0.77; fb.castShadow = true; fr.add(fb);
    const fl = new THREE.Mesh(BOX, glassMat); fl.scale.set(1.3, 0.04, 0.7); fl.position.y = 1.23; fr.add(fl); fr.position.set(1.0, 0, -2.4); scene.add(fr); upg.freezer = fr;
    const cc = new THREE.Group(); const cb = new THREE.Mesh(BOX, mat(0xf4f6f8)); cb.scale.set(0.2, 0.18, 0.4); cc.add(cb); const cl = new THREE.Mesh(SPHL, new THREE.MeshBasicMaterial({ color: 0xff2222 })); cl.scale.setScalar(0.06); cl.position.set(0, 0.06, 0.2); cc.add(cl);
    cc.position.set(4.4, 2.75, 0.4); cc.rotation.set(0.4, -0.6, 0); scene.add(cc); upg.cctv = cc;
    const wf = new THREE.Group(); const wbx = new THREE.Mesh(BOX, mat(0x222222)); wbx.scale.set(0.4, 0.08, 0.28); wf.add(wbx); for (const s of [-1, 1]) { const a = new THREE.Mesh(BOX, mat(0x222222)); a.scale.set(0.03, 0.3, 0.03); a.position.set(s * 0.15, 0.17, -0.1); wf.add(a); }
    wf.position.set(2.6, 2.5, -3.0); scene.add(wf); upg.wifi = wf;
    const gs = new THREE.Group(); const gb = new THREE.Mesh(BOX, mat(0xe0a21b)); gb.scale.set(1.0, 0.7, 0.7); gb.position.y = 0.35; gb.castShadow = true; gs.add(gb);
    gs.position.set(5.8, 0, -1.6); scene.add(gs); upg.genset = gs;
    const et = new THREE.Mesh(BOX, glassMat); et.scale.set(1.6, 0.7, 0.6); et.position.set(-4.0, 0.7, 0.6); scene.add(et); upg.etalase = et;
    const bike = new THREE.Group(); const bm = mat(0x1d4fd8), wm = mat(0x222222);
    for (const x of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 16), wm); w.position.set(x, 0.34, 0); bike.add(w); }
    const frm = new THREE.Mesh(BOX, bm); frm.scale.set(1.1, 0.06, 0.06); frm.position.y = 0.6; bike.add(frm);
    const hb = new THREE.Mesh(BOX, wm); hb.scale.set(0.06, 0.06, 0.5); hb.position.set(0.5, 0.9, 0); bike.add(hb);
    bike.position.set(5.6, 0.18, 0.9); bike.rotation.y = 0.2; scene.add(bike); upg.sepeda = bike;
  }

  // ---------- Karakter ----------
  function charGeo(o) {
    const t = new Batch();
    const S = (o.scale || 1) * 1.12;
    t.box(0.5, 0.62, 0.3, o.shirt, 0, 1.12, 0);
    if (o.stripe) t.box(0.51, 0.1, 0.31, o.stripe, 0, 1.2, 0).box(0.51, 0.06, 0.31, 0xffffff, 0, 1.1, 0);
    if (o.collar) t.box(0.52, 0.07, 0.32, o.collar, 0, 1.42, 0);
    if (o.dress) t.add(CONE8, o.dress, M(0, 0.62, 0, 0, 0.74, 1.05, 0.6));
    else t.box(0.46, 0.2, 0.28, o.pants, 0, 0.8, 0);
    t.box(0.14, 0.1, 0.14, o.skin, 0, 1.47, 0);
    const hy = 1.7;
    if (o.hat === 'hijab') {
      t.add(SPH, o.hair, M(0, hy, -0.02, 0, 0.56, 0.6, 0.55)).add(CONE8, o.hair, M(0, 1.42, 0, 0, 0.66, 0.36, 0.56));
      t.add(SPH, o.skin, M(0, hy - 0.02, 0.09, 0, 0.34, 0.38, 0.33));
    } else {
      t.add(SPH, o.skin, M(0, hy, 0, 0, 0.44, 0.48, 0.44));
      if (o.hat === 'peci') t.add(CYL, 0x1a1a1a, M(0, hy + 0.2, -0.01, 0, 0.4, 0.14, 0.4)).add(SPH, o.hair, M(0, hy + 0.05, -0.06, 0, 0.44, 0.32, 0.4));
      else if (o.hat === 'helmet') t.add(SPH, o.hcol, M(0, hy + 0.07, -0.02, 0, 0.56, 0.52, 0.56)).box(0.36, 0.1, 0.05, 0x222222, 0, hy + 0.02, 0.25);
      else if (o.hat === 'cap') t.add(SPH, o.hcol, M(0, hy + 0.09, -0.02, 0, 0.48, 0.34, 0.48)).box(0.3, 0.04, 0.22, o.hcol, 0, hy + 0.09, 0.24);
      else if (o.hat === 'hood') t.add(SPH, o.hcol, M(0, hy + 0.03, -0.04, 0, 0.56, 0.58, 0.55)).box(0.38, 0.12, 0.08, 0x111111, 0, hy - 0.06, 0.2);
      else if (o.hat === 'bun') t.add(SPH, o.hair, M(0, hy + 0.07, -0.05, 0, 0.48, 0.38, 0.46)).add(SPH, o.hair, M(0, hy + 0.1, -0.23, 0, 0.22, 0.22, 0.22));
      else if (o.hat === 'curler') { t.add(SPH, o.hair, M(0, hy + 0.07, -0.05, 0, 0.48, 0.38, 0.46)); for (let i = -1; i <= 1; i++) t.add(CYL, 0xf06aa8, M(i * 0.11, hy + 0.25, -0.02, 0, 0.09, 0.11, 0.09, 0, Math.PI / 2)); }
      else t.add(SPH, o.hair, M(0, hy + 0.07, -0.05, 0, 0.48, 0.36, 0.46));
    }
    const ez = o.hat === 'hijab' ? 0.25 : 0.22;
    if (o.hat !== 'hood') t.box(0.045, 0.06, 0.02, 0x1a1a1a, -0.08, hy + 0.02, ez).box(0.045, 0.06, 0.02, 0x1a1a1a, 0.08, hy + 0.02, ez);
    else t.box(0.05, 0.05, 0.02, 0xffffff, -0.08, hy + 0.05, 0.24).box(0.05, 0.05, 0.02, 0xffffff, 0.08, hy + 0.05, 0.24);
    if (o.glasses) t.box(0.34, 0.07, 0.03, 0x111111, 0, hy + 0.03, 0.24);
    if (o.sack) t.add(SPHL, 0xb89a6a, M(0, 1.1, -0.32, 0, 0.5, 0.65, 0.38));
    const leg = new Batch().box(0.18, 0.66, 0.2, o.pants, 0, -0.33, 0).box(0.2, 0.1, 0.3, o.shoe || 0x2b2b2b, 0, -0.68, 0.04).geo();
    const arm = new Batch().box(0.14, 0.52, 0.16, o.sleeve || o.shirt, 0, -0.23, 0).add(SPH, o.skin, M(0, -0.54, 0, 0, 0.14, 0.14, 0.14)).geo();
    return { torso: t.geo(), leg, arm, S, sarung: o.sarung };
  }
  function makeChar(o, parent = scene) {
    const G = charGeo(o);
    const g = new THREE.Group();
    const torso = new THREE.Mesh(G.torso, VC); torso.castShadow = true; g.add(torso);
    const legs = [-0.11, 0.11].map(x => { const m = new THREE.Mesh(G.leg, VC); m.position.set(x, 0.74, 0); m.castShadow = true; g.add(m); return m; });
    if (G.sarung) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.7, 10), mat(G.sarung)); s.position.y = 0.42; s.castShadow = true; g.add(s); }
    const arms = [-0.32, 0.32].map(x => { const m = new THREE.Mesh(G.arm, VC); m.position.set(x, 1.38, 0); m.castShadow = true; g.add(m); return m; });
    const hold = new THREE.Group(); hold.position.set(0.35, 0.8, 0.15); g.add(hold);
    g.scale.setScalar(G.S);
    parent.add(g);
    return { g, legs, arms, hold, ph: Math.random() * 6, x: 0, z: 0, r: 0, init: false, carryKey: '', geos: G };
  }
  function disposeChar(c) { c.g.parent && c.g.parent.remove(c.g); c.geos.torso.dispose(); c.geos.leg.dispose(); c.geos.arm.dispose(); }
  function lookFor(ty, seed) {
    const r = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
    const o = { skin: SKINS[r(SKINS.length)], hair: HAIRS[r(HAIRS.length)], shirt: SHIRTS[r(SHIRTS.length)], pants: [0x2b3a55, 0x4a3b2a, 0x3c3c3c, 0x5a4a6a][r(4)] };
    if (ty === 'ibu' || ty === 'rt' || ty === 'rewel') { if (r(10) < 7 || ty === 'rt') { o.hat = 'hijab'; o.hair = PASTEL[r(PASTEL.length)]; } else o.hat = 'bun'; o.dress = [0x7b4b8a, 0x8a5a3a, 0x355c7d, 0x9a6b4a, 0x5a7a4a][r(5)]; o.sleeve = o.shirt; }
    if (ty === 'rewel') { o.hat = 'curler'; o.glasses = true; o.shirt = 0xd65c8f; o.hair = 0x2a1a12; }
    if (ty === 'bapak') { o.hat = r(3) ? 'peci' : null; o.collar = 0xffffff; if (r(2)) o.shirt = 0xf2efe6; if (r(2)) o.sarung = SARUNG[r(SARUNG.length)]; }
    if (ty === 'anak') { o.shirt = 0xffffff; o.pants = 0xc0392b; o.scale = 0.72; o.hat = r(2) ? 'cap' : null; o.hcol = 0xc0392b; o.shoe = 0x111111; }
    if (ty === 'ojol') { o.shirt = 0x1fa34a; o.sleeve = 0x1fa34a; o.hat = 'helmet'; o.hcol = 0x1fa34a; o.pants = 0x22252b; }
    if (ty === 'rt') o.scale = 1.04;
    if (ty === 'thief') { o.shirt = 0x2a2d33; o.sleeve = 0x2a2d33; o.hat = 'hood'; o.hcol = 0x2a2d33; o.pants = 0x1c1e22; o.sack = true; }
    return o;
  }
  function animChar(c, x, z, r, moving, dt, t, carrying, faceCam) {
    if (!c.init) { c.x = x; c.z = z; c.init = true; c.r = r > 0 ? Math.PI / 2 : -Math.PI / 2; }
    const k = 1 - Math.exp(-dt * 12);
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz > 25) { c.x = x; c.z = z; } else { c.x += dx * k; c.z += dz * k; }
    const target = faceCam ? 0.35 : (r > 0 ? Math.PI / 2 : -Math.PI / 2);
    let dr = target - c.r; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
    c.r += dr * Math.min(1, dt * 10);
    c.g.position.set(c.x, 0.18, c.z); c.g.rotation.y = c.r;
    c.amp = (c.amp || 0) + ((moving ? 1 : 0) - (c.amp || 0)) * Math.min(1, dt * 10);
    c.ph += dt * 10 * c.amp;
    const s = Math.sin(c.ph) * 0.65 * c.amp;
    c.legs[0].rotation.x = s; c.legs[1].rotation.x = -s;
    c.arms[0].rotation.x = -s * 0.7; c.arms[1].rotation.x = carrying ? -0.3 : s * 0.7;
    c.g.position.y = 0.18 + Math.abs(Math.sin(c.ph)) * 0.04 * c.amp;
  }
  const bagGeo = new Batch().add(SPHL, 0x18191c, M(0, -0.25, 0, 0, 0.38, 0.42, 0.3)).box(0.04, 0.2, 0.04, 0x18191c, -0.08, 0.02, 0).box(0.04, 0.2, 0.04, 0x18191c, 0.08, 0.02, 0).geo();
  function setCarry(c, bag) {
    const key = bag && bag.length ? 'b' : '';
    if (key === c.carryKey) return; c.carryKey = key;
    while (c.hold.children.length) c.hold.remove(c.hold.children[0]);
    if (key) { const m = new THREE.Mesh(bagGeo, VC); m.castShadow = true; c.hold.add(m); }
  }

  // ---------- Kendaraan ----------
  function vehicle(kind) {
    const g = new THREE.Group();
    const dk = mat(0x1d1d1f);
    const wheel = (x, z, r = 0.38) => { const w = new THREE.Mesh(CYL, dk); w.scale.set(r * 2, 0.26, r * 2); w.rotation.x = Math.PI / 2; w.position.set(x, r, z); w.castShadow = true; g.add(w); };
    const b = new Batch();
    if (kind === 'angkot') {
      b.box(4.2, 1.5, 1.8, 0x3fae49, 0, 1.25, 0).box(4.22, 0.25, 1.82, 0xf2e04a, 0, 0.75, 0).box(1.1, 0.95, 1.7, 0x3fae49, 2.5, 0.98, 0);
      b.box(2.8, 0.6, 1.82, 0x2a3a44, -0.5, 1.6, 0).box(0.8, 0.5, 1.6, 0x2a3a44, 2.6, 1.3, 0).box(4.0, 0.12, 1.7, 0xdddddd, -0.1, 2.06, 0);
      b.box(0.1, 0.2, 0.4, 0xfff3c4, 3.06, 0.95, 0.6).box(0.1, 0.2, 0.4, 0xfff3c4, 3.06, 0.95, -0.6);
      wheel(1.9, 0.92); wheel(1.9, -0.92); wheel(-1.4, 0.92); wheel(-1.4, -0.92);
    } else if (kind === 'pickup') {
      b.box(1.6, 1.4, 1.8, 0x2b2b30, 1.7, 1.1, 0).box(1.4, 0.55, 1.82, 0x384656, 1.75, 1.55, 0).box(3.0, 0.6, 1.9, 0x2b2b30, -0.6, 0.75, 0);
      b.box(3.0, 0.5, 0.08, 0x3a3a40, -0.6, 1.25, 0.95).box(3.0, 0.5, 0.08, 0x3a3a40, -0.6, 1.25, -0.95);
      b.box(1.0, 0.7, 0.9, 0xc49a6c, -1.2, 1.4, 0.3).box(0.9, 0.6, 0.8, 0xf2c230, -0.2, 1.35, -0.3).box(0.8, 0.5, 0.7, 0x2f7fe0, -1.4, 1.3, -0.5);
      wheel(1.6, 0.92); wheel(1.6, -0.92); wheel(-1.3, 0.92); wheel(-1.3, -0.92);
    } else {
      b.box(1.5, 0.35, 0.35, [0xd7263d, 0x2f6fd6, 0x222222, 0xf2f2f2][Math.floor(Math.random() * 4)], 0, 0.62, 0).box(0.6, 0.12, 0.3, 0x222222, -0.2, 0.86, 0).box(0.12, 0.5, 0.12, 0x555555, 0.6, 0.9, 0);
      wheel(0.6, 0, 0.3); wheel(-0.6, 0, 0.3);
    }
    const m = new THREE.Mesh(b.geo(), VC); m.castShadow = true; g.add(m);
    if (kind === 'motor') {
      const rider = makeChar(lookFor('ojol', Math.floor(Math.random() * 999)), g); rider.g.position.set(-0.15, 0.1, 0); rider.g.rotation.y = Math.PI / 2;
      rider.legs[0].rotation.x = rider.legs[1].rotation.x = -1.3; rider.arms[0].rotation.x = rider.arms[1].rotation.x = -1.2;
    }
    scene.add(g);
    return g;
  }
  const traffic = [
    { g: vehicle('angkot'), x: -60, z: 5.2, sp: 7, dir: 1 },
    { g: vehicle('motor'), x: 30, z: 8.1, sp: 9, dir: -1 },
    { g: vehicle('motor'), x: -10, z: 4.8, sp: 10, dir: 1 },
    { g: vehicle('angkot'), x: 70, z: 8.3, sp: 6, dir: -1 },
  ];
  const courier = vehicle('pickup'); courier.visible = false;

  // ---------- Entity pool ----------
  const pools = { pl: new Map(), cu: new Map(), th: new Map(), rt: new Map(), dt: new Map(), lk: new Map(), mk: new Map(), bx: new Map() };
  function sync(pool, list, create, update, destroy) {
    const seen = new Set();
    for (const e of list) { seen.add(e.id); let o = pool.get(e.id); if (!o) { o = create(e); pool.set(e.id, o); } update(o, e); }
    for (const [id, o] of pool) if (!seen.has(id)) { destroy(o); pool.delete(id); }
  }
  const rm = o => scene.remove(o.g || o);
  const ratGeo = new Batch().box(0.32, 0.16, 0.18, 0x6b6f75, 0, 0.1, 0).add(SPHL, 0x6b6f75, M(0.17, 0.12, 0, 0, 0.18, 0.14, 0.16)).box(0.34, 0.03, 0.03, 0xb08080, -0.3, 0.08, 0).geo();
  const dirtGeo = new THREE.CircleGeometry(0.32, 7); dirtGeo.rotateX(-Math.PI / 2);
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x6e5034, transparent: true, opacity: 0.85 });
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x7ec3ea, transparent: true, opacity: 0.6, roughness: 0.1 });
  const dropMat = new THREE.MeshBasicMaterial({ color: 0x9fdcff });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.32, depthWrite: false });
  const beamRed = new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.38, depthWrite: false });
  const ringGeo = new THREE.RingGeometry(0.6, 0.85, 24); ringGeo.rotateX(-Math.PI / 2);
  const beamGeo = new THREE.CylinderGeometry(0.45, 0.45, 5, 16, 1, true);
  const boxMesh = new Batch().box(0.6, 0.45, 0.45, 0xc49a6c, 0, 0.22, 0).box(0.62, 0.05, 0.12, 0xe8d9b8, 0, 0.45, 0).geo();

  const RAIN_N = mobile ? 500 : 900;
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xc6dcff, transparent: true, opacity: 0.5 }));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const rainSeed = []; for (let i = 0; i < RAIN_N; i++) rainSeed.push([Math.random() * 44 - 22, Math.random() * 14, Math.random() * 26 - 14]);

  // ---------- Update ----------
  const camT = new THREE.Vector3(0, 0, 0);
  let camK = 1;
  const C = { day: new THREE.Color(0xa9d8f5), dusk: new THREE.Color(0xffa36c), night: new THREE.Color(0x141c36), rain: new THREE.Color(0x8796a8) };
  const tmpC = new THREE.Color();
  let wonApplied = false;
  function fade(m, target, dt) { const mt = m.material; const o = mt.opacity + (target - mt.opacity) * Math.min(1, dt * 8); mt.opacity = o; mt.depthWrite = o > 0.95; m.castShadow = o > 0.5; }

  function update(v, ctx) {
    const { dt, t, me, myId, menu, inside } = ctx;
    const h = (v ? v.tm : 15.5 * 60) / 60;
    const e = Math.sin(Math.PI * (h - 6) / 12);
    const dayF = THREE.MathUtils.smoothstep(e, -0.12, 0.3);
    const duskF = Math.max(0, 1 - Math.abs(e - 0.1) / 0.25) * (h > 12 ? 1 : 0.5);
    tmpC.copy(C.night).lerp(C.day, dayF).lerp(C.dusk, duskF * 0.55);
    const raining = v && v.rain;
    if (raining) tmpC.lerp(C.rain, 0.5 * dayF + 0.2);
    sky.copy(tmpC); scene.fog.color.copy(tmpC);
    sun.intensity = (2.8 * dayF + 0.1) * (raining ? 0.45 : 1);
    sun.color.setHex(duskF > 0.3 ? 0xffa86a : 0xffe0b5);
    hemi.intensity = 0.35 + 0.8 * dayF;
    hemi.color.setHex(dayF > 0.3 ? 0xdcefff : 0x7f93c8);
    const night = dayF < 0.55, power = !v || v.power;
    lamp.intensity = night && power ? 26 : 0;
    bulbMat.emissive.setHex(night && power ? 0xffd27a : 0x000000);
    megaGlass.emissive.setHex(night ? 0x6fb0e0 : 0x000000);
    fridge.userData.door.material.emissive.setHex(power ? (night ? 0x5a7a90 : 0x1a2a33) : 0x000000);
    const neon = v && v.up && v.up.neon;
    signMat.emissiveIntensity = night ? (neon && power ? 0.9 + Math.sin(t * 3) * 0.1 : 0.15) : 0;
    meterLed.material.color.setHex(power ? 0x33ff66 : (Math.sin(t * 10) > 0 ? 0xff2222 : 0x440000));

    const portrait = camera.aspect < 0.9;
    let tx, tz, k;
    if (menu || !me) { tx = Math.sin(t * 0.08) * 6; tz = -1.5; k = portrait ? 1.2 : 0.85; }
    else if (inside) { tx = 0.6; tz = portrait ? -3.4 : -2.4; k = portrait ? 1.0 : 0.62; }
    else { tx = me.x; tz = -0.6; k = portrait ? 1.15 : 0.8; }
    camT.x += (tx - camT.x) * Math.min(1, dt * 5); camT.z += (tz - camT.z) * Math.min(1, dt * 5); camK += (k - camK) * Math.min(1, dt * 4);
    camera.position.set(camT.x + 11 * camK, 21 * camK, camT.z + 18 * camK);
    camera.lookAt(camT.x, 0.9, camT.z);
    sun.position.set(camT.x - 14, 26, camT.z + 12);
    sun.target.position.set(camT.x, 0, camT.z - 2);

    fade(wRoof, inside || menu ? 0.12 : 1, dt); ridge.material.opacity = wRoof.material.opacity; ridge.material.depthWrite = wRoof.material.depthWrite;
    if (!v) { renderer.render(scene, camera); return; }
    for (const kk in upg) upg[kk].visible = !!v.up[kk];
    if (upg.kipas.visible) upg.kipas.userData.blades.rotation.z += dt * (power ? 14 : 0.5);
    for (const kk in shelfVis) {
      const sv = shelfVis[kk];
      sv.g.visible = isUnlocked(kk, v.lv, v.up);
      const n = Math.ceil((v.stock[kk] || 0) / capOf(kk, v.up) * sv.items.length);
      sv.items.forEach((m, i) => { m.visible = i < n; });
    }
    if (v.won && !wonApplied) { wonApplied = true; signText = ['TOKO', 'KOMPAK', 'kelontong lengkap']; signTex.userData.redraw(); }

    const insideIdx = {}; let ii = 0;
    for (const p of v.pl) if (p.w) insideIdx[p.id] = ii++;
    sync(pools.pl, v.pl, e => makeChar({ ...lookFor('x', e.c * 37 + 11), shirt: PCOLORS[e.c % PCOLORS.length], stripe: 0x1f1f1f, pants: 0x4a3b2a, hat: null }),
      (c, e) => {
        const local = e.id === myId && me;
        let x, z, mv;
        if (e.w) { const i = insideIdx[e.id] || 0; x = COUNTER[i % 2].x + (i > 1 ? 0.8 : 0); z = INSIDE.z; mv = false; }
        else { x = local ? me.x : e.x; z = LANE_Z - 0.15; mv = local ? me.m : e.m; }
        animChar(c, x, z, local && !e.w ? me.r : e.r, mv, dt, t, e.bag && e.bag.length, e.w);
        setCarry(c, e.bag);
      }, disposeChar);
    sync(pools.cu, v.cu, e => makeChar(lookFor(e.ty, e.lk)), (c, e) => animChar(c, e.x, e.z, e.r, e.m, dt, t, false, e.st === 'slot' || e.st === 'queue'), disposeChar);
    sync(pools.th, v.th, e => { const c = makeChar(lookFor('thief', 3)); const ring = new THREE.Mesh(ringGeo, beamRed); ring.position.y = 0.05; c.g.add(ring); return c; },
      (c, e) => { animChar(c, e.x, e.z, e.r, e.m || e.st === 'run', dt, t, false, e.st === 'steal'); if (e.st === 'steal') c.arms[0].rotation.x = -1.6 + Math.sin(t * 14) * 0.4; }, disposeChar);
    sync(pools.rt, v.rt, e => { const m = new THREE.Mesh(ratGeo, VC); m.castShadow = true; scene.add(m); return { g: m, x: e.x, z: e.z }; },
      (o, e) => { o.x += (e.x - o.x) * Math.min(1, dt * 10); o.z += (e.z - o.z) * Math.min(1, dt * 10); o.g.position.set(o.x, 0.33 + Math.abs(Math.sin(t * 20)) * 0.03, o.z); o.g.rotation.y = -e.r; }, rm);
    sync(pools.dt, v.dt, e => { const g = new THREE.Group(); const m = new THREE.Mesh(dirtGeo, dirtMat); m.scale.set(1 + (e.id % 3) * 0.2, 1, 0.8 + (e.id % 2) * 0.3); m.rotation.y = e.id; g.add(m);
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(BOX, mat(0xe8d9b8)); c.scale.set(0.12, 0.04, 0.16); c.position.set(Math.sin(e.id + i * 2) * 0.22, 0.02, Math.cos(e.id * 3 + i) * 0.18); c.rotation.y = i; g.add(c); }
      scene.add(g); return { g }; }, (o, e) => o.g.position.set(e.x, e.in ? 0.34 : 0.19, e.z), rm);
    sync(pools.lk, v.lk, e => { const g = new THREE.Group(); const p = new THREE.Mesh(dirtGeo, puddleMat); p.scale.setScalar(1.2); p.position.y = 0.34; g.add(p);
      const d = new THREE.Mesh(SPHL, dropMat); d.scale.set(0.07, 0.12, 0.07); g.add(d);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.38, 10), mat(0x3d7fc2)); b.position.y = 0.5; b.castShadow = true; g.add(b);
      scene.add(g); return { g, d, b }; }, (o, e) => { o.g.position.set(e.x, 0, e.z); o.b.visible = e.b; o.d.position.y = 3.0 - ((t * 2.2 + e.id) % 1) * 2.6; }, rm);
    sync(pools.bx, v.bx.map((b, i) => ({ ...b, i })), () => { const m = new THREE.Mesh(boxMesh, VC); m.castShadow = true; scene.add(m); return { g: m }; },
      (o, e) => { o.g.position.set(-2.2 + (e.i % 4) * 0.7, 0.32 + Math.floor(e.i / 4) * 0.46, -1.9 - (e.i % 2) * 0.3); o.g.rotation.y = e.id * 0.3; }, rm);
    const marks = [];
    for (const j of v.jobs) if (j.acc) marks.push({ id: 'j' + j.id, x: HOUSES[j.h].x + 1.2, red: false });
    if (!v.power) marks.push({ id: 'pw', x: METER.x, red: true });
    sync(pools.mk, marks, e => { const g = new THREE.Group(); const b = new THREE.Mesh(beamGeo, e.red ? beamRed : beamMat); b.position.y = 2.5; g.add(b); const r = new THREE.Mesh(ringGeo, e.red ? beamRed : beamMat); r.position.y = 0.2; g.add(r); scene.add(g); return { g, r }; },
      (o, e) => { o.g.position.set(e.x, 0, LANE_Z); const s = 1 + Math.sin(t * 4) * 0.12; o.r.scale.set(s, 1, s); }, rm);
    for (const c of traffic) {
      c.x += c.dir * c.sp * dt;
      if (c.x > 90) c.x = -90; if (c.x < -90) c.x = 90;
      c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI;
    }
    if (v.cour >= 0) {
      courier.visible = true;
      const c = v.cour; let x;
      if (c < 3.2) x = -60 + (c / 3.2) * 54; else if (c < 4.8) x = -6; else x = -6 + (c - 4.8) / 3.2 * 70;
      courier.position.set(x, 0, 4.4);
    } else courier.visible = false;
    rain.visible = !!raining;
    if (raining) {
      for (let i = 0; i < RAIN_N; i++) { const s = rainSeed[i]; s[1] -= dt * 16; if (s[1] < 0) s[1] += 14; const x = camT.x + s[0], z = camT.z + s[2], y = s[1]; rainPos.set([x, y, z, x - 0.05, y + 0.6, z], i * 6); }
      rainGeo.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 0.9 ? 34 : 26; camera.updateProjectionMatrix();
  }
  const pv = new THREE.Vector3();
  function project(x, y, z) { pv.set(x, y, z).project(camera); return { x: (pv.x + 1) / 2 * innerWidth, y: (1 - pv.y) / 2 * innerHeight, vis: pv.z < 1 && pv.z > -1 }; }
  function entPos(kind, id) { const o = pools[kind].get(id); return o ? { x: o.x !== undefined ? o.x : o.g.position.x, z: o.z !== undefined ? o.z : o.g.position.z, s: o.g.scale.x } : null; }
  resize();
  return { update, resize, project, entPos, renderer, scene, camera, pools };
}
