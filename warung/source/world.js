// ===== Dunia 3D (Three.js) =====
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ITEMS, STATIONS, HOUSES, BUILD, TREES, DROP, METER, WARUNG, ROAD, doorOf, capOf, isUnlocked, inWarung } from './data.js';

export const PCOLORS = [0xe2483d, 0x2f7fe0, 0x23a35a, 0xf2a31b, 0x8e5bd6, 0xf06aa8];
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x9a6233, 0xffd9b0];
const SHIRTS = [0xe96d5b, 0x5b8fe9, 0x6cc48a, 0xf4c95d, 0xb084e0, 0xf29e6d, 0x4fb8c4, 0xe7e2d6, 0xd65c8f, 0x7f8c4f];
const HAIRS = [0x1b1410, 0x2e1e14, 0x3b2a1e, 0x111111];
const PASTEL = [0xf6a6b2, 0x9ad0ec, 0xc8b6ff, 0xfde2a7, 0xa8e6cf, 0xffb385, 0x7fb3d5, 0xe8a0bf];

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function M(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const CYL6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
const SPH = new THREE.IcosahedronGeometry(0.5, 1);
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
  mesh(mat, cast = true, recv = true) { const m = new THREE.Mesh(this.geo(), mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
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
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const sky = new THREE.Color(0x9fd8ff);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 40, 95);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.3, 160);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6b8a4a, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const lamp = new THREE.PointLight(0xffc874, 0, 16, 1.4);
  lamp.position.set(0, 2.7, -1);
  scene.add(lamp);

  const VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o })); return mats.get(k); };

  // ---------- Tanah, jalan, sawah ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), mat(0x86c25e));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const st = new Batch();
  st.box(140, 0.06, ROAD.z1 - ROAD.z0, 0x5d6168, 0, 0.03, (ROAD.z0 + ROAD.z1) / 2);
  for (let x = -66; x < 66; x += 4) st.box(2, 0.07, 0.18, 0xf2f2e8, x, 0.04, (ROAD.z0 + ROAD.z1) / 2);
  st.box(140, 0.14, 1.5, 0xd2cabb, 0, 0.07, ROAD.z0 - 0.75);
  st.box(140, 0.14, 1.5, 0xd2cabb, 0, 0.07, ROAD.z1 + 0.75);
  st.box(22, 0.05, 4.6, 0xdcc79d, -1, 0.025, 4.3); // halaman depan warung
  st.box(18, 0.06, 2.6, 0x8a8f96, 0, 0.03, 14.3); // parkiran megamart
  for (let x = -7; x <= 7; x += 2.5) st.box(0.12, 0.07, 2, 0xffffff, x, 0.04, 14.3);
  // jalan setapak ke sawah & rumah
  st.box(1.6, 0.05, 20, 0xc9b38a, 0, 0.025, -16);
  // sawah
  st.box(28, 0.05, 20, 0x77b9a5, 0, 0.02, -17);
  for (let x = -14; x <= 14; x += 7) st.box(0.4, 0.22, 20, 0x8b6b45, x, 0.1, -17);
  for (let z = -27; z <= -7; z += 5) st.box(28, 0.22, 0.4, 0x8b6b45, 0, 0.1, z);
  // gubuk & orang-orangan sawah
  st.box(2.4, 0.2, 2.4, 0x9a7444, 8, 1.1, -12).box(0.15, 2.2, 0.15, 0x7a5634, 7, 0.9, -11).box(0.15, 2.2, 0.15, 0x7a5634, 9, 0.9, -11)
    .box(0.15, 2.2, 0.15, 0x7a5634, 7, 0.9, -13).box(0.15, 2.2, 0.15, 0x7a5634, 9, 0.9, -13);
  st.add(CONE4, 0xd9b15c, M(8, 2.6, -12, Math.PI / 4, 3.6, 1.2, 3.6));
  st.box(0.1, 1.8, 0.1, 0x6b4a2b, -8, 0.9, -20).box(1.4, 0.1, 0.1, 0x6b4a2b, -8, 1.4, -20).box(0.6, 0.7, 0.3, 0xc24a3a, -8, 1.35, -20);
  st.add(SPH, 0xe8c37a, M(-8, 1.95, -20, 0, 0.45, 0.45, 0.45)).add(CONE8, 0xd9b15c, M(-8, 2.25, -20, 0, 0.8, 0.3, 0.8));
  scene.add(st.mesh(VC, true, true));
  // padi (instanced)
  {
    const g = new THREE.ConeGeometry(0.12, 0.5, 4);
    const pts = [];
    for (let x = -13.3; x < 13.5; x += 0.7) for (let z = -26.3; z < -7.5; z += 0.7) {
      if (Math.abs(((x + 14) % 7)) < 0.5 || Math.abs(((z + 27) % 5)) < 0.5) continue;
      pts.push([x, z]);
    }
    const im = new THREE.InstancedMesh(g, mat(0x5fae3a), pts.length);
    pts.forEach(([x, z], i) => im.setMatrixAt(i, M(x, 0.26, z, (x * z) % 3, 1, 0.8 + ((x * 7 + z * 3) % 1 + 1) % 1 * 0.5, 1)));
    im.receiveShadow = true; scene.add(im);
  }
  // pohon
  {
    const b = new Batch(), bp = new Batch();
    for (const t of TREES) {
      if (t.palm) {
        bp.add(CYL6, 0x9a7a52, M(t.x, 2.2 * t.s, t.z, 0, 0.28 * t.s, 4.4 * t.s, 0.28 * t.s, 0.06, 0.05));
        for (let i = 0; i < 6; i++) {
          const a = t.rot + i * Math.PI / 3;
          bp.add(CONE4, i % 2 ? 0x3f9b46 : 0x4caf50, M(t.x + Math.sin(a) * 1.1 * t.s, 4.3 * t.s, t.z + Math.cos(a) * 1.1 * t.s, a, 0.7 * t.s, 2.6 * t.s, 0.25 * t.s, Math.PI / 2 - 0.35, 0));
        }
        bp.add(SPH, 0x6b4a2b, M(t.x, 4.35 * t.s, t.z, 0, 0.55 * t.s, 0.45 * t.s, 0.55 * t.s));
      } else {
        b.add(CYL6, 0x7b5a3a, M(t.x, 1.0 * t.s, t.z, 0, 0.34 * t.s, 2 * t.s, 0.34 * t.s));
        b.add(SPH, 0x3e9a4b, M(t.x, 2.6 * t.s, t.z, t.rot, 2.6 * t.s, 2.2 * t.s, 2.6 * t.s));
        b.add(SPH, 0x52b25a, M(t.x + 0.5 * t.s, 3.2 * t.s, t.z + 0.3 * t.s, t.rot, 1.6 * t.s, 1.4 * t.s, 1.6 * t.s));
      }
    }
    scene.add(b.mesh(VC), bp.mesh(VC));
  }
  // lampu jalan
  const lampHeads = new THREE.MeshLambertMaterial({ color: 0xfff3c4, emissive: 0x000000 });
  {
    const b = new Batch();
    const pos = [];
    for (let x = -36; x <= 36; x += 18) { pos.push([x, ROAD.z0 - 1.2]); }
    for (const [x, z] of pos) b.add(CYL6, 0x4a4f57, M(x, 2.4, z, 0, 0.14, 4.8, 0.14)).box(1.2, 0.1, 0.1, 0x4a4f57, x + 0.5, 4.75, z);
    scene.add(b.mesh(VC));
    const hb = new Batch();
    for (const [x, z] of pos) hb.box(0.5, 0.16, 0.3, 0xffffff, x + 1.0, 4.66, z);
    const hm = new THREE.Mesh(hb.geo(), lampHeads); scene.add(hm);
  }

  // ---------- Rumah & bangunan ----------
  const fadeables = [];
  function house(H, opt = {}) {
    const b = new Batch();
    const h = opt.h || 3;
    b.box(H.w, h, H.d, H.col, 0, h / 2, 0);
    b.box(H.w + 0.3, 0.35, H.d + 0.3, 0x9b9081, 0, 0.17, 0);
    b.add(CONE4, H.roof, M(0, h + 1.0, 0, Math.PI / 4, H.w * 1.15, 2.0, H.d * 1.15));
    b.box(1.0, 1.9, 0.08, 0x6b4428, 0, 0.95, H.d / 2 + 0.02);
    b.box(1.1, 0.8, 0.08, 0x9fd3f0, -H.w / 2 + 1.2, 1.7, H.d / 2 + 0.02).box(1.1, 0.8, 0.08, 0x9fd3f0, H.w / 2 - 1.2, 1.7, H.d / 2 + 0.02);
    b.box(1.3, 0.08, 0.12, 0xffffff, -H.w / 2 + 1.2, 2.15, H.d / 2 + 0.04).box(1.3, 0.08, 0.12, 0xffffff, H.w / 2 - 1.2, 2.15, H.d / 2 + 0.04);
    b.box(1.6, 0.12, 1.2, 0xb9ad9b, 0, 0.06, H.d / 2 + 0.6);
    if (opt.plants) for (let i = -1; i <= 1; i += 2) { b.add(CYL, 0xb5653a, M(i * 1.1, 0.25, H.d / 2 + 0.5, 0, 0.4, 0.5, 0.4)); b.add(SPH, 0x3f9b46, M(i * 1.1, 0.75, H.d / 2 + 0.5, 0, 0.7, 0.6, 0.7)); }
    const m = new THREE.Mesh(b.geo(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 1 }));
    m.castShadow = m.receiveShadow = true;
    m.position.set(H.x, 0, H.z); m.rotation.y = H.rot || 0;
    scene.add(m);
    fadeables.push({ m, x0: H.x - H.w / 2 - 1, x1: H.x + H.w / 2 + 1, z0: H.z - H.d / 2 - 7, z1: H.z + (H.rot ? H.d / 2 : -H.d / 2 + 1.5) });
    return m;
  }
  for (const k in HOUSES) house(HOUSES[k], { plants: true });
  // MegaMart
  const megaSign = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#1d4fd8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd400'; g.fillRect(0, h - 18, w, 18);
    g.fillStyle = '#ffffff'; g.font = '800 78px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MEGAMART', w / 2, h / 2 - 6);
  });
  const megaGlass = new THREE.MeshLambertMaterial({ color: 0xbfe6ff, emissive: 0x000000 });
  {
    const B = BUILD.megamart;
    const b = new Batch();
    b.box(B.w, 4.2, B.d, 0xf4f6f8, 0, 2.1, 0).box(B.w + 0.4, 0.5, B.d + 0.4, 0x1d4fd8, 0, 4.4, 0).box(B.w + 0.2, 0.3, B.d + 0.2, 0xe23b3b, 0, 3.95, 0);
    b.box(B.w + 0.3, 0.25, B.d + 0.3, 0xa0a6ad, 0, 0.12, 0);
    const m = new THREE.Mesh(b.geo(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true }));
    m.position.set(B.x, 0, B.z); m.rotation.y = Math.PI; m.castShadow = m.receiveShadow = true; scene.add(m);
    const glass = new THREE.Mesh(BOX, megaGlass); glass.scale.set(B.w - 2, 2.6, 0.1); glass.position.set(B.x, 1.5, B.z - B.d / 2 - 0.02); scene.add(glass);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: megaSign }));
    sign.position.set(B.x, 5.6, B.z - B.d / 2 + 0.5); sign.rotation.y = Math.PI; sign.rotation.y = 0; sign.position.z = B.z - B.d / 2 - 0.25; scene.add(sign);
    const pole = new Batch(); pole.box(0.2, 1.2, 0.2, 0x8a8f96, B.x - 3, 5, B.z - B.d / 2 - 0.1).box(0.2, 1.2, 0.2, 0x8a8f96, B.x + 3, 5, B.z - B.d / 2 - 0.1);
    scene.add(pole.mesh(VC));
    fadeables.push({ m, x0: -99, x1: -98, z0: 0, z1: 0 });
  }
  // Mushola
  {
    const B = BUILD.mushola;
    const b = new Batch();
    b.box(B.w, 3.2, B.d, 0xf7f4ec, 0, 1.6, 0).box(B.w + 0.4, 0.3, B.d + 0.4, 0x2f8a5b, 0, 3.3, 0);
    b.add(SPH, 0x2f9d6a, M(0, 3.5, 0, 0, 3.6, 3.0, 3.6)).add(CYL6, 0xd4af37, M(0, 5.3, 0, 0, 0.08, 0.8, 0.08)).add(SPH, 0xd4af37, M(0, 5.75, 0, 0, 0.25, 0.25, 0.25));
    b.box(1.4, 2.2, 0.1, 0x6b4428, 0, 1.1, B.d / 2 + 0.02).box(5.5, 0.15, 1.6, 0xb9ad9b, 0, 0.08, B.d / 2 + 0.8);
    b.add(CYL6, 0xf7f4ec, M(B.w / 2 + 0.6, 3, -B.d / 2 + 0.6, 0, 0.8, 6, 0.8)).add(CONE8, 0x2f9d6a, M(B.w / 2 + 0.6, 6.5, -B.d / 2 + 0.6, 0, 1.1, 1.2, 1.1));
    const m = b.mesh(VC); m.position.set(B.x, 0, B.z); m.rotation.y = Math.PI; scene.add(m);
  }
  // Sekolah SD
  {
    const B = BUILD.sekolah;
    const b = new Batch();
    b.box(B.w, 3, B.d, 0xf3efe2, 0, 1.5, 0).box(B.w, 0.9, B.d, 0xd8433a, 0, 0.45, 0);
    b.add(CONE4, 0xa8452f, M(0, 3.9, 0, Math.PI / 4, B.w * 1.05, 1.8, B.d * 1.3));
    for (let i = -1; i <= 1; i++) b.box(1.3, 1.0, 0.08, 0x9fd3f0, i * 2.4, 1.8, B.d / 2 + 0.02);
    b.add(CYL6, 0xcfcfcf, M(B.w / 2 + 2, 3, B.d / 2 + 2, 0, 0.1, 6, 0.1));
    b.box(1.2, 0.4, 0.04, 0xe23b3b, B.w / 2 + 2.6, 5.7, B.d / 2 + 2).box(1.2, 0.4, 0.04, 0xffffff, B.w / 2 + 2.6, 5.3, B.d / 2 + 2);
    const m = b.mesh(VC); m.position.set(B.x, 0, B.z); m.rotation.y = Math.PI; scene.add(m);
  }

  // ---------- Warung ----------
  const W = WARUNG;
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#e9dfcc' : '#c9764f'; g.fillRect(i * 32, j * 32, 32, 32); }
    g.strokeStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 1.7);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W.x1 - W.x0, 0.14, W.z1 - W.z0), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.position.set(0, 0.07, (W.z0 + W.z1) / 2); floor.receiveShadow = true; scene.add(floor);
  const wb = new Batch();
  const WALL = 0x7fcaa6, WAIN = 0x2f8f66, WOOD = 0xa86f43, DWOOD = 0x7a4c2c;
  // dinding belakang
  wb.box(12.4, 1.1, 0.3, WAIN, 0, 0.55, W.z0 - 0.1).box(12.4, 1.9, 0.3, WALL, 0, 2.05, W.z0 - 0.1);
  // samping kiri & kanan, ada pintu
  for (const s of [-1, 1]) {
    const x = s * 6.1;
    wb.box(0.3, 1.1, 2.9, WAIN, x, 0.55, -3.15).box(0.3, 1.9, 2.9, WALL, x, 2.05, -3.15);
    wb.box(0.3, 1.1, 2.2, WAIN, x, 0.55, 1.1).box(0.3, 1.9, 2.2, WALL, x, 2.05, 1.1);
    wb.box(0.3, 0.6, 1.6, WALL, x, 2.7, -0.8); // atas pintu
    wb.box(0.36, 2.4, 0.12, DWOOD, x, 1.2, -1.62).box(0.36, 2.4, 0.12, DWOOD, x, 1.2, 0.02);
  }
  // tiang & lintel depan
  wb.box(0.35, 3.0, 0.35, DWOOD, -6.05, 1.5, 2.1).box(0.35, 3.0, 0.35, DWOOD, 6.05, 1.5, 2.1);
  // meja depan
  wb.box(12, 0.95, 0.85, WOOD, 0, 0.48, 1.75).box(12.2, 0.08, 1.0, DWOOD, 0, 0.98, 1.75);
  for (let x = -5.5; x <= 5.5; x += 1.1) wb.box(0.06, 0.8, 0.02, DWOOD, x, 0.46, 2.18);
  // toples kerupuk
  for (const x of [-4.8, -4.1, 3.9, 4.6]) { wb.add(CYL, 0xd9eef7, M(x, 1.28, 1.75, 0, 0.5, 0.55, 0.5)); wb.add(CYL, 0x2a62c9, M(x, 1.6, 1.75, 0, 0.54, 0.1, 0.54)); wb.add(CYL, 0xf3d27a, M(x, 1.22, 1.75, 0, 0.42, 0.36, 0.42)); }
  // etalase kaca kecil di meja + kas
  wb.box(1.4, 0.5, 0.7, 0xa9d8ef, -1.8, 1.27, 1.75).box(0.7, 0.3, 0.5, 0x5a3a24, 1.6, 1.17, 1.6);
  // renceng sachet gantung
  const RC = [0xe6463c, 0xf2c230, 0x2a62c9, 0x23a35a, 0x7a4a2c, 0xf06aa8];
  for (let i = 0; i < 14; i++) { const x = -5.3 + i * 0.82; wb.box(0.22, 0.9, 0.03, RC[i % RC.length], x, 1.9, 2.0); for (let j = 0; j < 4; j++) wb.box(0.24, 0.02, 0.035, 0xffffff, x, 1.55 + j * 0.22, 2.0); }
  // rak belakang
  for (const k of ['mie', 'snack', 'kopi', 'beras', 'sabun']) {
    const x = STATIONS[k].x;
    wb.box(2.0, 2.3, 0.08, DWOOD, x, 1.15, -4.42);
    for (const y of [0.1, 0.75, 1.4, 2.05]) wb.box(2.0, 0.07, 0.7, WOOD, x, y, -4.1);
    wb.box(0.07, 2.3, 0.7, DWOOD, x - 1.0, 1.15, -4.1).box(0.07, 2.3, 0.7, DWOOD, x + 1.0, 1.15, -4.1);
  }
  // meja telur & krat air
  wb.box(0.65, 0.85, 1.2, WOOD, -5.67, 0.43, 0.7).box(0.65, 0.4, 1.6, 0x3d7fc2, -5.67, 0.2, -3.0).box(0.65, 0.4, 1.6, 0x2f6aa8, -5.67, 0.6, -3.0);
  // meja kosong kanan (tempat kulkas/freezer)
  wb.box(0.4, 0.06, 1.2, 0x9b9081, 5.75, 0.04, -2.9).box(0.4, 0.06, 1.1, 0x9b9081, 5.6, 0.04, 0.7);
  // luar: tong sampah, bale-bale, meteran, area drop
  wb.add(CYL, 0x2f8f66, M(-6.8, 0.45, 2.8, 0, 0.66, 0.9, 0.66));
  wb.box(2.4, 0.12, 1.2, 0xd6b46a, 9.2, 0.55, 4.0);
  for (const dx of [-1.05, 1.05]) for (const dz of [-0.5, 0.5]) wb.box(0.1, 0.55, 0.1, 0xb08a4a, 9.2 + dx, 0.27, 4.0 + dz);
  wb.box(0.25, 0.7, 0.5, 0x9aa3ad, 6.38, 1.6, -3.7).box(0.27, 0.12, 0.3, 0x333333, 6.4, 1.75, -3.7);
  wb.box(3.2, 0.03, 3.2, 0xe0b04a, DROP.x, 0.06, DROP.z).box(2.9, 0.035, 2.9, 0xdcc79d, DROP.x, 0.065, DROP.z);
  // tumpukan gas: rak besi
  wb.box(1.1, 0.06, 1.15, 0x555b63, 7.2, 0.05, 1.5);
  const warungMesh = wb.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true }));
  scene.add(warungMesh);
  // atap seng
  const roofTex = canvasTex(128, 128, (g, w, h) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#b8613f' : '#9c4d31'; g.fillRect(i * 8, 0, 8, h); }
    g.fillStyle = 'rgba(80,40,20,.25)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 6, 2);
  });
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping; roofTex.repeat.set(5, 1);
  const roofMat = new THREE.MeshLambertMaterial({ map: roofTex, transparent: true, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.08, 9.0), roofMat);
  roof.position.set(0, 3.55, -0.9); roof.rotation.x = 0.1; roof.castShadow = true; scene.add(roof);
  const awnMat = new THREE.MeshLambertMaterial({ map: canvasTex(64, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#2a62c9'; g.fillRect(i * 8, 0, 8, h); } }), transparent: true, side: THREE.DoubleSide });
  awnMat.map.wrapS = THREE.RepeatWrapping; awnMat.map.repeat.set(6, 1);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.05, 1.6), awnMat);
  awning.position.set(0, 2.95, 3.0); awning.rotation.x = 0.28; awning.castShadow = true; scene.add(awning);
  // papan nama
  let signText = ['WARUNG KOMPAK', 'sembako · kopi · gas · jajanan'];
  const signTex = canvasTex(1024, 160, (g, w, h) => {
    g.fillStyle = '#ffcf3a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c0392b'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#c0392b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 84px "Baloo 2", system-ui, sans-serif'; g.fillText(signText[0], w / 2, h / 2 - 16);
    g.fillStyle = '#5a2a12'; g.font = '600 34px "Baloo 2", system-ui, sans-serif'; g.fillText(signText[1], w / 2, h / 2 + 46);
  });
  const signMat = new THREE.MeshLambertMaterial({ map: signTex, emissive: 0x000000, emissiveMap: signTex, transparent: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.12), signMat);
  sign.position.set(0, 3.85, 2.75); sign.rotation.x = -0.12; scene.add(sign);
  const signBackMat = new THREE.MeshLambertMaterial({ color: 0x5a3a24, transparent: true });
  const signBack = new THREE.Mesh(BOX, signBackMat); signBack.scale.set(7.4, 1.25, 0.08); signBack.position.set(0, 3.85, 2.7); signBack.rotation.x = -0.12; scene.add(signBack);
  document.fonts && document.fonts.ready.then(() => { signTex.userData.redraw(); megaSign.userData.redraw(); });
  // bohlam
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xfff6d6, emissive: 0x000000 });
  const bulb = new THREE.Mesh(SPH, bulbMat); bulb.scale.setScalar(0.22); bulb.position.set(0, 2.85, -1); scene.add(bulb);
  // lampu indikator meteran
  const meterLed = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0x33ff66 })); meterLed.scale.setScalar(0.09); meterLed.position.set(6.53, 1.95, -3.7); scene.add(meterLed);

  // ---------- Isi rak (berubah sesuai stok) ----------
  const shelfVis = {};
  function addShelf(k, slots) {
    const g = new THREE.Group(); scene.add(g);
    const items = slots.map(s => {
      const m = new THREE.Mesh(s.geo || BOX, mat(s.col || ITEMS[k].col)); m.position.set(s.x, s.y, s.z); m.scale.set(...s.s);
      if (s.ry) m.rotation.y = s.ry; m.castShadow = true; g.add(m); return m;
    });
    shelfVis[k] = { g, items };
  }
  const backShelf = (k, gen) => { const x0 = STATIONS[k].x, sl = []; for (const y of [0.14, 0.79, 1.44]) for (let i = 0; i < 4; i++) sl.push(gen(x0 - 0.72 + i * 0.48, y)); addShelf(k, sl); };
  backShelf('mie', (x, y) => ({ x, y: y + 0.17, z: -4.05, s: [0.38, 0.28, 0.5], col: [0xf2c230, 0xe6463c, 0xf2c230][Math.round(y * 2) % 3] }));
  backShelf('snack', (x, y) => ({ x, y: y + 0.25, z: -4.05, s: [0.36, 0.45, 0.2], col: [0xe8743b, 0x2a9d8f, 0xe9c46a][Math.round(x * 3 + 9) % 3] }));
  backShelf('kopi', (x, y) => ({ x, y: y + 0.18, z: -4.05, s: [0.32, 0.32, 0.32], col: [0x7a4a2c, 0xc0392b, 0x3b2416][Math.round(x * 3 + 9) % 3] }));
  backShelf('beras', (x, y) => ({ x, y: y + 0.2, z: -4.05, s: [0.42, 0.36, 0.42], geo: SPH, col: 0xf7f4ea }));
  backShelf('sabun', (x, y) => ({ x, y: y + 0.14, z: -4.05, s: [0.34, 0.22, 0.24], col: [0x6fd0b4, 0x9ad0ec, 0xf6a6b2][Math.round(x * 3 + 9) % 3] }));
  { const sl = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) sl.push({ x: -5.67 + (j - 1) * 0.18, y: 1.0, z: -3.6 + i * 0.4, s: [0.13, 0.42, 0.13], geo: CYL, col: 0x8fd0ff }); addShelf('air', sl); }
  { const sl = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) sl.push({ x: -5.67 + (j - 1) * 0.17, y: 0.95, z: 0.3 + i * 0.27, s: [0.13, 0.17, 0.13], geo: SPH, col: 0xf1e2c6 }); addShelf('telur', sl); }
  { const sl = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) sl.push({ x: 7.0 + j * 0.45, y: 0.4, z: 1.2 + i * 0.4 - (j ? 0.2 : 0), s: [0.38, 0.62, 0.38], geo: CYL, col: 0x41b35c }); addShelf('gas', sl); }
  // kulkas & freezer (upgrade)
  const upg = {};
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(BOX, mat(0xf4f6f8)); body.scale.set(0.7, 2.0, 1.5); body.position.set(5.65, 1.0, -2.9); body.castShadow = true; g.add(body);
    const door = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.55 })); door.scale.set(0.05, 1.7, 1.3); door.position.set(5.28, 1.05, -2.9); g.add(door);
    const top = new THREE.Mesh(BOX, mat(0xe23b3b)); top.scale.set(0.72, 0.25, 1.52); top.position.set(5.65, 2.05, -2.9); g.add(top);
    scene.add(g); upg.kulkas = g;
    const sl = []; for (const y of [0.45, 0.95, 1.45]) for (let i = 0; i < 4; i++) sl.push({ x: 5.55, y, z: -3.45 + i * 0.36, s: [0.14, 0.34, 0.14], geo: CYL, col: 0xd98b2b });
    addShelf('teh', sl);
    const f = new THREE.Group();
    const fb = new THREE.Mesh(BOX, mat(0xf4f6f8)); fb.scale.set(0.8, 0.9, 1.2); fb.position.set(5.6, 0.45, 0.7); fb.castShadow = true; f.add(fb);
    const fl = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 })); fl.scale.set(0.82, 0.05, 1.22); fl.position.set(5.6, 0.92, 0.7); f.add(fl);
    const fs = new THREE.Mesh(BOX, mat(0x2a62c9)); fs.scale.set(0.02, 0.3, 0.9); fs.position.set(5.19, 0.6, 0.7); f.add(fs);
    scene.add(f); upg.freezer = f;
    const sl2 = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) sl2.push({ x: 5.4 + j * 0.2, y: 0.82, z: 0.3 + i * 0.27, s: [0.14, 0.18, 0.14], geo: CONE8, col: [0xf6b3d0, 0xfff1c9, 0x9ad0ec][(i + j) % 3] });
    addShelf('eskrim', sl2);
  }
  // upgrade lain
  {
    const fan = new THREE.Group(); const hub = new THREE.Mesh(CYL, mat(0xdddddd)); hub.scale.set(0.25, 0.15, 0.25); fan.add(hub);
    const rod = new THREE.Mesh(CYL, mat(0x999999)); rod.scale.set(0.05, 0.5, 0.05); rod.position.y = 0.3; fan.add(rod);
    const blades = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(BOX, mat(0xf4f6f8)); b.scale.set(1.1, 0.03, 0.22); b.position.x = 0.6; const p = new THREE.Group(); p.rotation.y = i * Math.PI * 2 / 3; p.add(b); blades.add(p); }
    fan.add(blades); fan.position.set(-2, 2.75, -1.6); scene.add(fan); upg.kipas = fan; upg.kipas.userData.blades = blades;
    const radio = new THREE.Group(); const rb = new THREE.Mesh(BOX, mat(0x3a3a3a)); rb.scale.set(0.6, 0.32, 0.24); radio.add(rb);
    for (const s of [-1, 1]) { const sp = new THREE.Mesh(CYL, mat(0x888888)); sp.scale.set(0.16, 0.03, 0.16); sp.rotation.x = Math.PI / 2; sp.position.set(s * 0.17, 0, 0.12); radio.add(sp); }
    const ant = new THREE.Mesh(CYL, mat(0xcccccc)); ant.scale.set(0.02, 0.5, 0.02); ant.position.set(0.25, 0.35, 0); ant.rotation.z = -0.4; radio.add(ant);
    radio.position.set(0.4, 1.2, 1.65); scene.add(radio); upg.radio = radio;
    const qr = new THREE.Group(); const qb = new THREE.Mesh(BOX, mat(0xffffff)); qb.scale.set(0.32, 0.42, 0.04); qr.add(qb);
    const qc = new THREE.Mesh(BOX, mat(0x111111)); qc.scale.set(0.22, 0.22, 0.05); qc.position.y = -0.03; qr.add(qc);
    const qt = new THREE.Mesh(BOX, mat(0xe23b3b)); qt.scale.set(0.32, 0.08, 0.05); qt.position.y = 0.17; qr.add(qt);
    qr.position.set(2.4, 1.25, 1.95); qr.rotation.x = -0.25; scene.add(qr); upg.qris = qr;
    const cc = new THREE.Group(); const cb = new THREE.Mesh(BOX, mat(0xf4f6f8)); cb.scale.set(0.2, 0.18, 0.4); cc.add(cb);
    const cl = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xff2222 })); cl.scale.setScalar(0.06); cl.position.set(0, 0.06, 0.2); cc.add(cl);
    cc.position.set(5.6, 2.7, 1.9); cc.rotation.y = -0.6; cc.rotation.x = 0.4; scene.add(cc); upg.cctv = cc;
    const wf = new THREE.Group(); const wbx = new THREE.Mesh(BOX, mat(0x222222)); wbx.scale.set(0.4, 0.08, 0.28); wf.add(wbx);
    for (const s of [-1, 1]) { const a = new THREE.Mesh(BOX, mat(0x222222)); a.scale.set(0.03, 0.3, 0.03); a.position.set(s * 0.15, 0.17, -0.1); wf.add(a); }
    const wl = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0x33ff66 })); wl.scale.setScalar(0.04); wl.position.set(0.1, 0.05, 0.15); wf.add(wl);
    wf.position.set(4.4, 2.2, -4.1); scene.add(wf); upg.wifi = wf;
    const gs = new THREE.Group(); const gb = new THREE.Mesh(BOX, mat(0xe0a21b)); gb.scale.set(1.0, 0.7, 0.7); gb.position.y = 0.35; gb.castShadow = true; gs.add(gb);
    const gf = new THREE.Mesh(BOX, mat(0x333333)); gf.scale.set(1.1, 0.12, 0.8); gf.position.y = 0.06; gs.add(gf);
    const gx = new THREE.Mesh(CYL, mat(0x555555)); gx.scale.set(0.1, 0.4, 0.1); gx.position.set(0.35, 0.85, 0); gs.add(gx);
    gs.position.set(7.6, 0, -4.4); scene.add(gs); upg.genset = gs;
    const kr = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(BOX, mat(0xe23b3b)); b.scale.set(0.5, 0.25, 0.35); b.position.y = 0.13 + i * 0.12; b.rotation.y = i * 0.15; kr.add(b); }
    kr.position.set(-5.3, 0, 0.0); scene.add(kr); upg.keranjang = kr;
    const et = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.5 })); et.scale.set(2.6, 0.55, 0.75); et.position.set(-3.6, 1.3, 1.75); scene.add(et); upg.etalase = et;
    const bike = new THREE.Group(); const bm = mat(0x1d4fd8), wm = mat(0x222222);
    for (const x of [-0.6, 0.6]) { const w = new THREE.Mesh(CYL, wm); w.scale.set(0.7, 0.06, 0.7); w.rotation.z = Math.PI / 2; w.rotation.y = Math.PI / 2; w.position.set(x, 0.36, 0); bike.add(w); }
    const fr = new THREE.Mesh(BOX, bm); fr.scale.set(1.2, 0.07, 0.07); fr.position.y = 0.6; bike.add(fr);
    const sd = new THREE.Mesh(BOX, mat(0x333333)); sd.scale.set(0.3, 0.08, 0.16); sd.position.set(-0.3, 0.85, 0); bike.add(sd);
    const ps = new THREE.Mesh(BOX, bm); ps.scale.set(0.07, 0.5, 0.07); ps.position.set(-0.3, 0.6, 0); bike.add(ps);
    const hb = new THREE.Mesh(BOX, mat(0x333333)); hb.scale.set(0.07, 0.07, 0.6); hb.position.set(0.55, 0.95, 0); bike.add(hb);
    const bs = new THREE.Mesh(BOX, mat(0xc49a6c)); bs.scale.set(0.45, 0.3, 0.4); bs.position.set(0.75, 0.8, 0); bike.add(bs);
    bike.position.set(-7.4, 0, -2.6); bike.rotation.y = 0.3; scene.add(bike); upg.sepeda = bike;
    upg.neon = sign; // dipakai sebagai emissive
  }

  // ---------- Karakter ----------
  function charGeo(o) {
    const t = new Batch();
    const S = o.scale || 1;
    t.box(0.56, 0.62, 0.34, o.shirt, 0, 1.06, 0);
    if (o.apron) t.box(0.46, 0.56, 0.04, o.apron, 0, 0.98, 0.18).box(0.48, 0.05, 0.05, 0xffffff, 0, 1.24, 0.19);
    if (o.collar) t.box(0.58, 0.08, 0.36, o.collar, 0, 1.36, 0);
    t.box(0.52, 0.22, 0.32, o.pants, 0, 0.76, 0);
    t.box(0.16, 0.12, 0.16, o.skin, 0, 1.4, 0);
    const hy = 1.64;
    if (o.hat === 'hijab') {
      t.add(SPH, o.hair, M(0, hy, -0.02, 0, 0.62, 0.64, 0.6)).add(CONE8, o.hair, M(0, 1.38, 0, 0, 0.72, 0.36, 0.62));
      t.add(SPH, o.skin, M(0, hy - 0.02, 0.1, 0, 0.38, 0.42, 0.36));
    } else {
      t.add(SPH, o.skin, M(0, hy, 0, 0, 0.5, 0.5, 0.5));
      if (o.hat === 'peci') t.add(CYL, 0x1a1a1a, M(0, hy + 0.21, -0.01, 0, 0.44, 0.15, 0.44)).add(SPH, o.hair, M(0, hy + 0.06, -0.06, 0, 0.5, 0.36, 0.46));
      else if (o.hat === 'helmet') t.add(SPH, o.hcol, M(0, hy + 0.08, -0.02, 0, 0.62, 0.56, 0.62)).box(0.4, 0.12, 0.05, 0x222222, 0, hy + 0.02, 0.27);
      else if (o.hat === 'cap') t.add(SPH, o.hcol, M(0, hy + 0.1, -0.02, 0, 0.54, 0.38, 0.54)).box(0.32, 0.04, 0.24, o.hcol, 0, hy + 0.1, 0.26);
      else if (o.hat === 'hood') t.add(SPH, o.hcol, M(0, hy + 0.03, -0.04, 0, 0.62, 0.62, 0.6)).box(0.42, 0.12, 0.08, 0x111111, 0, hy - 0.06, 0.22);
      else if (o.hat === 'bun') t.add(SPH, o.hair, M(0, hy + 0.08, -0.05, 0, 0.54, 0.42, 0.52)).add(SPH, o.hair, M(0, hy + 0.12, -0.25, 0, 0.24, 0.24, 0.24));
      else if (o.hat === 'curler') { t.add(SPH, o.hair, M(0, hy + 0.08, -0.05, 0, 0.54, 0.42, 0.52)); for (let i = -1; i <= 1; i++) t.add(CYL, 0xf06aa8, M(i * 0.12, hy + 0.27, -0.02, 0, 0.1, 0.12, 0.1, 0, Math.PI / 2)); }
      else t.add(SPH, o.hair, M(0, hy + 0.08, -0.05, 0, 0.54, 0.4, 0.52));
    }
    if (o.hat !== 'hood') t.box(0.05, 0.07, 0.02, 0x1a1a1a, -0.09, hy + 0.02, o.hat === 'hijab' ? 0.27 : 0.24).box(0.05, 0.07, 0.02, 0x1a1a1a, 0.09, hy + 0.02, o.hat === 'hijab' ? 0.27 : 0.24);
    else t.box(0.05, 0.05, 0.02, 0xffffff, -0.09, hy + 0.05, 0.26).box(0.05, 0.05, 0.02, 0xffffff, 0.09, hy + 0.05, 0.26);
    if (o.glasses) t.box(0.36, 0.08, 0.03, 0x111111, 0, hy + 0.03, 0.26);
    if (o.sack) t.add(SPH, 0xb89a6a, M(0, 1.05, -0.35, 0, 0.55, 0.7, 0.4));
    const leg = new Batch().box(0.2, 0.6, 0.24, o.pants, 0, -0.3, 0).box(0.22, 0.12, 0.32, o.shoe || 0x2b2b2b, 0, -0.64, 0.04).geo();
    const arm = new Batch().box(0.16, 0.5, 0.18, o.sleeve || o.shirt, 0, -0.22, 0).add(SPH, o.skin, M(0, -0.52, 0, 0, 0.16, 0.16, 0.16)).geo();
    return { torso: t.geo(), leg, arm, S };
  }
  function makeChar(o) {
    const G = charGeo(o);
    const g = new THREE.Group();
    const torso = new THREE.Mesh(G.torso, VC); torso.castShadow = true; g.add(torso);
    const legs = [-0.13, 0.13].map(x => { const m = new THREE.Mesh(G.leg, VC); m.position.set(x, 0.7, 0); m.castShadow = true; g.add(m); return m; });
    const arms = [-0.36, 0.36].map(x => { const m = new THREE.Mesh(G.arm, VC); m.position.set(x, 1.32, 0); m.castShadow = true; g.add(m); return m; });
    const hold = new THREE.Group(); hold.position.set(0, 1.05, 0.42); g.add(hold);
    g.scale.setScalar(G.S);
    scene.add(g);
    return { g, legs, arms, hold, ph: Math.random() * 6, x: 0, z: 0, r: 0, init: false, carryKey: '', geos: G };
  }
  function disposeChar(c) { scene.remove(c.g); c.geos.torso.dispose(); c.geos.leg.dispose(); c.geos.arm.dispose(); }
  function lookFor(ty, seed) {
    const r = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
    const skin = SKINS[r(SKINS.length)], hair = HAIRS[r(HAIRS.length)], shirt = SHIRTS[r(SHIRTS.length)];
    const o = { skin, hair, shirt, pants: [0x2b3a55, 0x4a3b2a, 0x3c3c3c, 0x5a4a6a][r(4)] };
    if (ty === 'ibu') { if (r(10) < 6) { o.hat = 'hijab'; o.hair = PASTEL[r(PASTEL.length)]; } else o.hat = 'bun'; o.pants = [0x7b4b8a, 0x8a5a3a, 0x355c7d][r(3)]; }
    if (ty === 'bapak') { o.hat = r(2) ? 'peci' : null; o.collar = 0xffffff; }
    if (ty === 'anak') { o.shirt = 0xffffff; o.pants = 0xc0392b; o.scale = 0.72; o.hat = r(2) ? 'cap' : null; o.hcol = 0xc0392b; o.shoe = 0x111111; }
    if (ty === 'ojol') { o.shirt = 0x1fa34a; o.sleeve = 0x1fa34a; o.hat = 'helmet'; o.hcol = 0x1fa34a; o.pants = 0x22252b; }
    if (ty === 'rewel') { o.shirt = 0xd65c8f; o.hat = 'curler'; o.glasses = true; o.pants = 0x7b4b8a; }
    if (ty === 'pakrt') { o.shirt = 0x8a5a2b; o.collar = 0xe0b04a; o.hat = 'peci'; o.scale = 1.06; }
    if (ty === 'thief') { o.shirt = 0x2a2d33; o.sleeve = 0x2a2d33; o.hat = 'hood'; o.hcol = 0x2a2d33; o.pants = 0x1c1e22; o.sack = true; }
    if (ty === 'courier') { o.shirt = 0xf07a1b; o.hat = 'helmet'; o.hcol = 0xf07a1b; o.pants = 0x2b2b2b; }
    return o;
  }
  function animChar(c, x, z, r, moving, dt, t, carrying) {
    if (!c.init) { c.x = x; c.z = z; c.r = r; c.init = true; }
    const k = 1 - Math.exp(-dt * 14);
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz > 9) { c.x = x; c.z = z; } else { c.x += dx * k; c.z += dz * k; }
    let dr = r - c.r; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
    c.r += dr * Math.min(1, dt * 12);
    c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.r;
    const sp = moving ? 1 : 0;
    c.amp = (c.amp || 0) + (sp - (c.amp || 0)) * Math.min(1, dt * 10);
    c.ph += dt * 11 * c.amp;
    const s = Math.sin(c.ph) * 0.7 * c.amp;
    c.legs[0].rotation.x = s; c.legs[1].rotation.x = -s;
    if (carrying) { c.arms[0].rotation.x = c.arms[1].rotation.x = -1.25; }
    else { c.arms[0].rotation.x = -s * 0.8; c.arms[1].rotation.x = s * 0.8; }
    c.g.position.y = Math.abs(Math.sin(c.ph)) * 0.05 * c.amp + (moving ? 0 : Math.sin(t * 2 + c.ph) * 0.008);
  }
  function setCarry(c, ca, bx) {
    const key = (bx || '') + '|' + (ca || []).join(',');
    if (key === c.carryKey) return;
    c.carryKey = key;
    while (c.hold.children.length) c.hold.remove(c.hold.children[0]);
    if (bx) {
      const b = new THREE.Mesh(BOX, mat(0xc49a6c)); b.scale.set(0.62, 0.46, 0.46); b.position.set(0, 0.05, 0.05); b.castShadow = true; c.hold.add(b);
      const tp = new THREE.Mesh(BOX, mat(0xe8d9b8)); tp.scale.set(0.64, 0.06, 0.12); tp.position.set(0, 0.29, 0.05); c.hold.add(tp);
      const lb = new THREE.Mesh(BOX, mat(ITEMS[bx].col)); lb.scale.set(0.3, 0.2, 0.02); lb.position.set(0, 0.05, 0.29); c.hold.add(lb);
    } else if (ca && ca.length) {
      ca.forEach((k, i) => { const m = new THREE.Mesh(BOX, mat(ITEMS[k].col)); m.scale.set(0.16, 0.14, 0.14); m.position.set(((i % 3) - 1) * 0.17, Math.floor(i / 3) * 0.15, 0); c.hold.add(m); });
    }
  }

  // ---------- Entity pool ----------
  const pools = { pl: new Map(), cu: new Map(), th: new Map(), rt: new Map(), bx: new Map(), dt: new Map(), lk: new Map(), mk: new Map() };
  function sync(pool, list, create, update, destroy) {
    const seen = new Set();
    for (const e of list) { const id = e.id; seen.add(id); let o = pool.get(id); if (!o) { o = create(e); pool.set(id, o); } update(o, e); }
    for (const [id, o] of pool) if (!seen.has(id)) { destroy(o); pool.delete(id); }
  }
  const rm = o => scene.remove(o.g || o);
  const ratGeo = new Batch().box(0.32, 0.16, 0.18, 0x6b6f75, 0, 0.1, 0).add(SPH, 0x6b6f75, M(0, 0.12, 0.17, 0, 0.16, 0.14, 0.18)).add(SPH, 0xf0a0a0, M(0.06, 0.2, 0.15, 0, 0.06, 0.06, 0.03)).add(SPH, 0xf0a0a0, M(-0.06, 0.2, 0.15, 0, 0.06, 0.06, 0.03)).box(0.03, 0.03, 0.34, 0xb08080, 0, 0.08, -0.25).geo();
  const ratGeoR = ratGeo.clone(); ratGeoR.rotateY(Math.PI / 2);
  const boxGeo = new Batch().box(0.66, 0.5, 0.5, 0xc49a6c, 0, 0.25, 0).box(0.68, 0.06, 0.14, 0xe8d9b8, 0, 0.5, 0).geo();
  const dirtGeo = new THREE.CircleGeometry(0.35, 7); dirtGeo.rotateX(-Math.PI / 2);
  const dirtMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a, transparent: true, opacity: 0.85 });
  const crumbMat = mat(0xd9b48a);
  const puddleMat = new THREE.MeshLambertMaterial({ color: 0x7ec3ea, transparent: true, opacity: 0.6 });
  const dropMat = new THREE.MeshBasicMaterial({ color: 0x9fdcff });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.35, depthWrite: false });
  const beamRed = new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.4, depthWrite: false });
  const ringGeo = new THREE.RingGeometry(0.7, 0.95, 24); ringGeo.rotateX(-Math.PI / 2);
  const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 6, 16, 1, true);

  // kurir
  const courier = new THREE.Group();
  {
    const bm = mat(0xe23b3b), dk = mat(0x222222);
    for (const x of [-0.7, 0.7]) { const w = new THREE.Mesh(CYL, dk); w.scale.set(0.6, 0.18, 0.6); w.rotation.z = Math.PI / 2; w.rotation.y = Math.PI / 2; w.position.set(x, 0.3, 0); courier.add(w); }
    const body = new THREE.Mesh(BOX, bm); body.scale.set(1.4, 0.35, 0.4); body.position.y = 0.55; courier.add(body);
    const seat = new THREE.Mesh(BOX, dk); seat.scale.set(0.7, 0.12, 0.36); seat.position.set(-0.15, 0.8, 0); courier.add(seat);
    const front = new THREE.Mesh(BOX, bm); front.scale.set(0.2, 0.6, 0.45); front.position.set(0.65, 0.85, 0); courier.add(front);
    const bxm = new THREE.Mesh(BOX, mat(0xc49a6c)); bxm.scale.set(0.6, 0.55, 0.6); bxm.position.set(-0.7, 1.1, 0); courier.add(bxm);
    const rider = makeChar(lookFor('courier', 5)); scene.remove(rider.g); rider.g.position.set(-0.1, 0.12, 0); rider.g.rotation.y = Math.PI / 2;
    rider.legs[0].rotation.x = rider.legs[1].rotation.x = -1.3; rider.arms[0].rotation.x = rider.arms[1].rotation.x = -1.2;
    courier.add(rider.g);
    courier.traverse(o => { if (o.isMesh) o.castShadow = true; });
    courier.visible = false; scene.add(courier);
  }

  // hujan
  const RAIN_N = mobile ? 500 : 900;
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xbfd9ff, transparent: true, opacity: 0.55 }));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const rainSeed = []; for (let i = 0; i < RAIN_N; i++) rainSeed.push([Math.random() * 40 - 20, Math.random() * 14, Math.random() * 40 - 20]);

  // ---------- Update ----------
  const camT = new THREE.Vector3(0, 0, 0);
  const C = { day: new THREE.Color(0x9fd8ff), dusk: new THREE.Color(0xffa36c), night: new THREE.Color(0x17213d), rain: new THREE.Color(0x8796a8) };
  let roofOp = 1, wonApplied = false;
  const tmpC = new THREE.Color();
  function setFade(m, target, dt) {
    const mt = m.material; const o = mt.opacity + (target - mt.opacity) * Math.min(1, dt * 8);
    mt.opacity = o; mt.depthWrite = o > 0.95; m.castShadow = o > 0.5;
  }

  function update(v, ctx) {
    const { dt, t, me, myId, menu } = ctx;
    // langit & cahaya
    const h = (v ? v.tm : 16 * 60) / 60;
    const e = Math.sin(Math.PI * (h - 6) / 12);
    const dayF = THREE.MathUtils.smoothstep(e, -0.12, 0.3);
    const duskF = Math.max(0, 1 - Math.abs(e - 0.08) / 0.22) * (h > 12 ? 1 : 0.5);
    tmpC.copy(C.night).lerp(C.day, dayF).lerp(C.dusk, duskF * 0.6);
    const raining = v && v.rain;
    if (raining) tmpC.lerp(C.rain, 0.55 * dayF + 0.2);
    sky.copy(tmpC); scene.fog.color.copy(tmpC);
    sun.intensity = (2.3 * dayF + 0.12) * (raining ? 0.45 : 1);
    sun.color.setHex(duskF > 0.3 ? 0xffb27a : 0xfff1d6);
    hemi.intensity = 0.35 + 0.75 * dayF;
    hemi.color.setHex(dayF > 0.3 ? 0xffffff : 0x8fa3d6);
    const night = dayF < 0.55;
    const power = !v || v.power;
    lamp.intensity = night && power ? 22 : 0;
    bulbMat.emissive.setHex(night && power ? 0xffd27a : 0x000000);
    lampHeads.emissive.setHex(night ? 0xffe9a8 : 0x000000);
    megaGlass.emissive.setHex(night ? 0x6fb0e0 : 0x000000);
    const neon = v && v.up && v.up.neon;
    signMat.emissive.setHex(neon && night && power ? 0xffffff : (night ? 0x222222 : 0x000000));
    signMat.emissiveIntensity = neon && night && power ? 0.55 + Math.sin(t * 3) * 0.1 : 1;
    meterLed.material.color.setHex(power ? 0x33ff66 : (Math.sin(t * 10) > 0 ? 0xff2222 : 0x440000));

    // kamera
    const aspect = camera.aspect;
    if (menu || !me) {
      const a = t * 0.12;
      camT.set(0, 1, 0);
      camera.position.set(Math.sin(a) * 17, 8.5, Math.cos(a) * 17 + 3);
      camera.lookAt(0, 1.2, 0);
    } else {
      const far = aspect < 0.8 ? 1.45 : aspect < 1.2 ? 1.2 : 1;
      const tx = me.x, tz = me.z;
      camT.x += (tx - camT.x) * Math.min(1, dt * 6); camT.z += (tz - camT.z) * Math.min(1, dt * 6);
      camera.position.set(camT.x, 10.2 * far, camT.z + 9.2 * far);
      camera.lookAt(camT.x, 0.8, camT.z - 0.6);
    }
    sun.position.set(camT.x + 18 * Math.cos(h / 24 * 6.28), 30, camT.z + 12);
    sun.target.position.set(camT.x, 0, camT.z);

    // fade atap/bangunan kalau pemain di dalam/di belakang
    const px = me ? me.x : 0, pz = me ? me.z : 99;
    const underRoof = !menu && px > -7.6 && px < 7.6 && pz > -9 && pz < 2.4;
    roofOp += ((underRoof ? 0.12 : 1) - roofOp) * Math.min(1, dt * 8);
    roofMat.opacity = roofOp; roofMat.depthWrite = roofOp > 0.95; roof.castShadow = roofOp > 0.5;
    awnMat.opacity = Math.max(roofOp, underRoof && pz > 1.2 ? 0.25 : roofOp);
    const so = underRoof ? Math.max(0.12, roofOp) : roofOp;
    signMat.opacity = so; signBackMat.opacity = so; signMat.depthWrite = signBackMat.depthWrite = so > 0.95;
    setFade(warungMesh, !menu && pz < -4.6 && px > -7 && px < 7 ? 0.35 : 1, dt);
    for (const f of fadeables) setFade(f.m, !menu && px > f.x0 && px < f.x1 && pz > f.z0 && pz < f.z1 ? 0.3 : 1, dt);

    if (!v) { renderer.render(scene, camera); return; }

    // upgrade & stok
    for (const k in upg) if (k !== 'neon') upg[k].visible = !!v.up[k];
    if (upg.kipas.visible) upg.kipas.userData.blades.rotation.y += dt * (power ? 9 : 0.5);
    for (const k in shelfVis) {
      const sv = shelfVis[k];
      const unl = isUnlocked(k, v.lv, v.up);
      sv.g.visible = unl;
      const n = Math.ceil((v.stock[k] || 0) / capOf(k, v.up) * sv.items.length);
      sv.items.forEach((m, i) => { m.visible = i < n; });
    }
    if (v.won && !wonApplied) { wonApplied = true; signText = ['TOKO KELONTONG KOMPAK', 'lengkap · murah · ramah · buka sampai malam']; signTex.userData.redraw(); }

    // pemain
    sync(pools.pl, v.pl, e => { const c = makeChar({ ...lookFor('x', e.id.length * 77 + e.c * 13), shirt: PCOLORS[e.c % PCOLORS.length], apron: 0x2f8f66, pants: 0x2b3a55, hat: e.c % 2 ? 'cap' : null, hcol: 0xffcf3a }); return c; },
      (c, e) => {
        const local = e.id === myId && me;
        const x = local ? me.x : e.x, z = local ? me.z : e.z, r = local ? me.r : e.r, m = local ? me.m : e.m;
        if (local) { c.x = x; c.z = z; c.init = true; }
        animChar(c, x, z, r, m, dt, t, (e.ca && e.ca.length) || e.bx);
        setCarry(c, e.ca, e.bx);
      }, disposeChar);
    // pembeli
    sync(pools.cu, v.cu, e => makeChar(lookFor(e.ty, e.lk)), (c, e) => animChar(c, e.x, e.z, e.r, e.m, dt, t, false), disposeChar);
    // maling
    sync(pools.th, v.th, e => { const c = makeChar(lookFor('thief', 3)); const ring = new THREE.Mesh(ringGeo, beamRed); ring.position.y = 0.05; c.g.add(ring); return c; },
      (c, e) => { animChar(c, e.x, e.z, e.r, e.m || e.st === 'run', dt, t, e.st === 'steal'); if (e.st === 'steal') { c.arms[0].rotation.x = -1.6 + Math.sin(t * 14) * 0.4; } }, disposeChar);
    // tikus
    sync(pools.rt, v.rt, e => { const m = new THREE.Mesh(ratGeoR, VC); m.castShadow = true; scene.add(m); return { g: m, x: e.x, z: e.z }; },
      (o, e) => { o.x += (e.x - o.x) * Math.min(1, dt * 10); o.z += (e.z - o.z) * Math.min(1, dt * 10); o.g.position.set(o.x, 0.12, o.z); o.g.rotation.y = e.r + Math.PI / 2; o.g.position.y = 0.12 + Math.abs(Math.sin(t * 20)) * 0.03; }, rm);
    // kardus
    sync(pools.bx, v.bx, e => { const g = new THREE.Group(); const m = new THREE.Mesh(boxGeo, VC); m.castShadow = true; g.add(m); const lb = new THREE.Mesh(BOX, mat(ITEMS[e.k].col)); lb.scale.set(0.3, 0.2, 0.02); lb.position.set(0, 0.25, 0.26); g.add(lb); g.rotation.y = (e.id % 7) * 0.2 - 0.6; scene.add(g); return { g }; },
      (o, e) => o.g.position.set(e.x, 0.07, e.z), rm);
    // kotoran
    sync(pools.dt, v.dt, e => { const g = new THREE.Group(); const m = new THREE.Mesh(dirtGeo, dirtMat); m.scale.set(1 + (e.id % 3) * 0.2, 1, 0.8 + (e.id % 2) * 0.3); m.rotation.y = e.id; g.add(m);
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(BOX, crumbMat); c.scale.set(0.1, 0.05, 0.14); c.position.set(Math.sin(e.id + i * 2) * 0.25, 0.02, Math.cos(e.id * 3 + i) * 0.2); c.rotation.y = i; g.add(c); }
      scene.add(g); return { g }; }, (o, e) => o.g.position.set(e.x, inWarung(e.x, e.z) ? 0.15 : 0.07, e.z), rm);
    // bocor
    sync(pools.lk, v.lk, e => { const g = new THREE.Group(); const p = new THREE.Mesh(dirtGeo, puddleMat); p.scale.setScalar(1.2); p.position.y = 0.16; g.add(p);
      const d = new THREE.Mesh(SPH, dropMat); d.scale.set(0.07, 0.12, 0.07); g.add(d);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.4, 10), mat(0x3d7fc2)); b.position.y = 0.34; b.castShadow = true; g.add(b);
      scene.add(g); return { g, d, b }; },
      (o, e) => { o.g.position.set(e.x, 0, e.z); o.b.visible = e.b; o.d.position.y = 3.2 - ((t * 2.2 + e.id) % 1) * 3.0; }, rm);
    // penanda antar & listrik
    const marks = [];
    for (const j of v.jobs) if (j.acc) { const d = doorOf(j.h); marks.push({ id: 'j' + j.id, x: d.x, z: d.z, red: false }); }
    if (!v.power) marks.push({ id: 'pw', x: METER.x, z: METER.z, red: true });
    sync(pools.mk, marks, e => { const g = new THREE.Group(); const b = new THREE.Mesh(beamGeo, e.red ? beamRed : beamMat); b.position.y = 3; g.add(b); const r = new THREE.Mesh(ringGeo, e.red ? beamRed : beamMat); r.position.y = 0.06; g.add(r); scene.add(g); return { g, r }; },
      (o, e) => { o.g.position.set(e.x, 0, e.z); const s = 1 + Math.sin(t * 4) * 0.12; o.r.scale.set(s, 1, s); }, rm);
    // kurir
    if (v.cour >= 0) {
      courier.visible = true;
      const c = v.cour; let x;
      if (c < 3) x = -46 + (c / 3) * (46 + DROP.x + 1.5); else if (c < 4.6) x = DROP.x - 1.5; else x = DROP.x - 1.5 + (c - 4.6) / 3.4 * 60;
      courier.position.set(x, 0, 8.4);
    } else courier.visible = false;
    // hujan
    rain.visible = !!raining;
    if (raining) {
      for (let i = 0; i < RAIN_N; i++) {
        const s = rainSeed[i];
        s[1] -= dt * 16; if (s[1] < 0) s[1] += 14;
        const x = camT.x + s[0], z = camT.z + s[2], y = s[1];
        rainPos.set([x, y, z, x - 0.05, y + 0.6, z], i * 6);
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 58 : 48; camera.updateProjectionMatrix();
  }
  const pv = new THREE.Vector3();
  function project(x, y, z) {
    pv.set(x, y, z).project(camera);
    return { x: (pv.x + 1) / 2 * innerWidth, y: (1 - pv.y) / 2 * innerHeight, vis: pv.z < 1 && pv.z > -1 };
  }
  // posisi karakter yang sudah dihaluskan (buat label)
  function entPos(kind, id) { const o = pools[kind].get(id); return o ? { x: o.x !== undefined ? o.x : o.g.position.x, z: o.z !== undefined ? o.z : o.g.position.z, s: o.g.scale.x } : null; }
  resize();
  return { update, resize, project, entPos, renderer };
}
