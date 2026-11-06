import * as THREE from 'three'; import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// fuselage loft stations: z (nose +), half width, top, bottom
const ST = [[6.4, .05, .1, -.1], [6.05, .42, .42, -.42], [5.6, .62, .66, -.62], [4.9, .72, .78, -.72], [4.1, .78, .94, -.78], [3.3, .84, 1.22, -.84], [2.4, .86, 1.3, -.86], [1, .86, 1.3, -.86], [-.4, .84, 1.3, -.84], [-1.8, .76, 1.26, -.74], [-3.2, .6, 1.1, -.5], [-4.4, .42, .96, -.22], [-5.4, .26, .86, .08], [-6.2, .1, .78, .42]];
function paintTex(rusty) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'), W = 2048, H = 1024; g.fillStyle = '#e6e1d4'; g.fillRect(0, 0, W, H);
  const band = (y, h, col) => { g.fillStyle = col; g.fillRect(0, y, W, h); }; // u = along body, v = around (top at centre-ish)
  band(H * .34, H * .055, '#c5411f'); band(H * .402, H * .016, '#1f3b5c'); band(H * .582, H * .016, '#1f3b5c'); band(H * .6, H * .055, '#c5411f'); band(0, H * .1, '#c9c5b8'); band(H * .9, H * .1, '#8d8a80');
  g.strokeStyle = 'rgba(40,40,40,.35)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = i / 26 * W + 12; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let j = 1; j < 9; j++) { g.beginPath(); g.moveTo(0, j / 9 * H); g.lineTo(W, j / 9 * H); g.stroke(); }
  g.fillStyle = 'rgba(30,30,30,.4)'; for (let i = 0; i < 26; i++) for (let k = 0; k < 90; k++) { g.beginPath(); g.arc(i / 26 * W + 18, k / 90 * H, 1.1, 0, 7); g.fill(); }
  // windows both sides
  for (const y of [H * .205, H * .74]) for (let i = 0; i < 5; i++) { const x = W * (.36 + i * .058); g.fillStyle = '#16232e'; g.beginPath(); g.roundRect(x, y, 66, 64, 16); g.fill(); g.strokeStyle = '#99a'; g.lineWidth = 3; g.stroke(); const gr = g.createLinearGradient(x, y, x + 60, y + 60); gr.addColorStop(0, 'rgba(160,200,230,.5)'); gr.addColorStop(.5, 'rgba(160,200,230,0)'); g.fillStyle = gr; g.fill(); }
  g.save(); g.fillStyle = '#1f3b5c'; g.font = '900 86px sans-serif'; for (const [y, f] of [[H * .29, 1], [H * .78, -1]]) { g.save(); g.translate(W * .23, y); g.scale(-1 * f * -1, 1); g.fillText('PK-TRK', 0, 0); g.restore(); } g.restore();
  if (rusty) { for (let i = 0; i < 90; i++) { const x = Math.random() * W, y = Math.random() * H, r = 12 + Math.random() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${90 + Math.random() * 50},${50 + Math.random() * 20},20,${.2 + Math.random() * .35})`); gr.addColorStop(1, 'rgba(90,50,20,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (.4 + Math.random()), Math.random(), 0, 7); g.fill(); } for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(70,50,30,${Math.random() * .28})`; g.lineWidth = 1 + Math.random() * 4; const x = Math.random() * W, y = Math.random() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 30, y + 30 + Math.random() * 130); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function fuselageGeo() {
  const seg = 28, v = [], u = [], idx = []; const n = ST.length, section = (s, a) => { const c = Math.cos(a), sn = Math.sin(a), [z, w, t, b] = s; const top = sn >= 0, ex = 2.4, x = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / ex), y = (top ? t : -b * -1 * 1) * 0 + (top ? t * Math.pow(sn, 2 / ex) : b * Math.pow(-sn, 2 / ex)); return [x, y, z]; };
  for (let i = 0; i < n; i++) for (let k = 0; k <= seg; k++) { const a = k / seg * 6.2832 + Math.PI / 2; v.push(...section(ST[i], a)); u.push(1 - i / (n - 1), k / seg); }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = i * (seg + 1) + k, b = a + seg + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function foil(span, chord, th, dihedral = 0, taper = 1) { // wing panel along +x
  const P = [[1, 0], [.8, .05], [.5, .1], [.28, .12], [.12, .1], [.03, .055], [0, 0], [.03, -.03], [.12, -.04], [.28, -.045], [.5, -.04], [.8, -.02]], S = 10, v = [], u = [], idx = [], m = P.length;
  for (let i = 0; i <= S; i++) { const t = i / S, ch = chord * (1 - (1 - taper) * t); for (let k = 0; k <= m; k++) { const p = P[k % m]; v.push(span * t, (p[1] * th * ch * 4) + dihedral * t, (.5 - p[0]) * ch); u.push(t, k / m); } }
  for (let i = 0; i < S; i++) for (let k = 0; k < m; k++) { const a = i * (m + 1) + k, b = a + m + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const cap = v.length / 3, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function wingTex() { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#e4dfd0'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#c5411f'; g.fillRect(900, 0, 124, 256); g.strokeStyle = 'rgba(40,40,40,.4)'; g.lineWidth = 2; for (let i = 1; i < 16; i++) { g.beginPath(); g.moveTo(i / 16 * 1024, 0); g.lineTo(i / 16 * 1024, 256); g.stroke(); } for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, i / 6 * 256); g.lineTo(1024, i / 6 * 256); g.stroke(); } for (let i = 0; i < 90; i++) { const x = Math.random() * 1024, y = Math.random() * 256, r = 8 + Math.random() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(100,70,40,.3)'); gr.addColorStop(1, 'rgba(100,70,40,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
export function makePlane(tx) {
  const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt);
  const skin = new THREE.MeshPhysicalMaterial({ map: paintTex(true), roughness: .48, metalness: .3, clearcoat: .3, clearcoatRoughness: .45, side: THREE.DoubleSide }), wingM = new THREE.MeshStandardMaterial({ map: wingTex(), roughness: .5, metalness: .3, side: THREE.DoubleSide }), red = new THREE.MeshStandardMaterial({ color: 0xc5411f, roughness: .45, metalness: .3 }), dark = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: .55, metalness: .6 }), metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: .35, metalness: .95 }), rubber = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: .9 }), glass = new THREE.MeshPhysicalMaterial({ color: 0x8fb4c8, roughness: .08, metalness: .1, transparent: true, opacity: .55 });
  const add = (g, m, p = tilt) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
  const body = add(fuselageGeo(), skin);
  const shield = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); shield.scale(.78, .5, 1.05); shield.rotateX(-.42); shield.translate(0, .86, 3.72); add(shield, glass);
  const parts = {}; const P = k => (parts[k] = new THREE.Group(), tilt.add(parts[k]), parts[k]);
  // engine cowl
  const eg = P('engine'); { const c = new THREE.LatheGeometry([[0, .02], [.3, 0], [.5, .08], [.6, .3], [.66, .8], [.68, 1.3]].map(p => new THREE.Vector2(p[0], p[1])), 28); c.rotateX(-Math.PI / 2); c.translate(0, -.04, 7.4); const o = add(c, red, eg); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, cyl = new THREE.CylinderGeometry(.08, .08, .34, 8); cyl.rotateX(Math.PI / 2); cyl.translate(Math.cos(a) * .44, Math.sin(a) * .44 - .04, 7.04); add(cyl, dark, eg); } const ex = new THREE.CylinderGeometry(.05, .05, .6, 8); ex.rotateZ(1.2); ex.translate(.72, -.42, 6.2); add(ex, dark, eg); }
  // propeller
  const pg = P('prop'); const hub = new THREE.Group(); hub.position.set(0, -.04, 7.46); pg.add(hub); { const sp = new THREE.ConeGeometry(.2, .46, 20); sp.rotateX(Math.PI / 2); sp.translate(0, 0, .2); add(sp, metal, hub); for (let i = 0; i < 3; i++) { const b = foil(1.46, .24, .05, 0, .62); const o = add(b, dark, hub); o.rotation.z = i / 3 * 6.283; o.rotation.x = .3; } } parts.hub = hub;
  // wings: right wing is intact; left is a repair part
  const wgeo = foil(6.9, 1.9, .26, .25, .86), wr = add(wgeo, wingM); wr.position.set(.1, 1.38, .9);
  const wg = P('wing'), wl = add(foil(6.9, 1.9, .26, .25, .86), wingM, wg); wl.position.set(-.1, 1.38, .9); wl.scale.x = -1;
  const stub = add(foil(1.1, 1.9, .26, .05, 1), wingM); stub.position.set(-.1, 1.38, .9); stub.scale.x = -1;
  for (const [s, par] of [[1, tilt], [-1, wg]]) { const st = new THREE.CylinderGeometry(.045, .045, 3.6, 8); st.rotateZ(s * -1.22); st.translate(s * 1.92, .55, .9); add(st, metal, par); }
  // tail
  const hs = foil(2.5, 1.2, .16, .02, .7); const a1 = add(hs, wingM); a1.position.set(.1, .82, -5.5); const a2 = add(hs.clone(), wingM); a2.position.set(-.1, .82, -5.5); a2.scale.x = -1;
  const fin = foil(1.9, 1.5, .16, 0, .55); const f = add(fin, red); f.rotation.z = Math.PI / 2; f.position.set(0, .8, -5.65);
  // landing gear
  const gg = P('gear'); for (const s of [-1, 1]) { const st = new THREE.CylinderGeometry(.06, .08, 1.5, 10); st.rotateZ(s * .5); st.translate(s * .96, -1.25, 1.1); add(st, metal, gg); const w = new THREE.CylinderGeometry(.42, .42, .28, 22); w.rotateZ(Math.PI / 2); w.translate(s * 1.3, -1.9, 1.1); add(w, rubber, gg); const r = new THREE.CylinderGeometry(.2, .2, .3, 16); r.rotateZ(Math.PI / 2); r.translate(s * 1.3, -1.9, 1.1); add(r, metal, gg); }
  { const st = new THREE.CylinderGeometry(.03, .04, .6, 8); st.translate(0, .2, -5.9); add(st, metal, gg); const w = new THREE.CylinderGeometry(.13, .13, .08, 14); w.rotateZ(Math.PI / 2); w.translate(0, -.14, -5.9); add(w, rubber, gg); }
  // radio mast + cockpit panel
  const rg = P('radio'); { const m = new THREE.CylinderGeometry(.015, .03, 1, 6); m.translate(0, 1.76, -.8); add(m, dark, rg); const pn = new THREE.BoxGeometry(1.3, .4, .08); pn.translate(0, .72, 3.06); add(pn, dark, rg); const sc = new THREE.PlaneGeometry(.3, .2); sc.translate(0, .74, 3.11); const sm = new THREE.MeshStandardMaterial({ color: 0x0a2a14, emissive: 0x28e070, emissiveIntensity: 1.2 }); add(sc, sm, rg); }
  // belly fuel pod
  const tg = P('tank'); { const c = new THREE.CapsuleGeometry(.36, 2.6, 8, 18); c.rotateX(Math.PI / 2); c.translate(0, -.94, .5); add(c, wingM, tg); }
  root.userData = { parts, tilt, hub };
  return root;
}
export function applyPlane(o, plane, parts) { const { parts: P, tilt } = o.userData; for (const k of ['engine', 'prop', 'wing', 'gear', 'radio', 'tank']) P[k].visible = !!plane.parts[k]; if (plane.parts.gear) { tilt.position.y = 2.14; tilt.rotation.set(-.055, 0, 0); } else { tilt.position.y = .86; tilt.rotation.set(-.03, 0, .12); } }
// the loose part as it lies in the wild / carried
export function makePartProp(k, plane) { const src = plane.userData.parts[k]; const g = new THREE.Group(); const c = src.clone(true); c.visible = true; const b = new THREE.Box3().setFromObject(c), ctr = b.getCenter(new THREE.Vector3()); c.position.sub(ctr); g.add(c); const sz = b.getSize(new THREE.Vector3()); g.userData.size = sz; return g; }
