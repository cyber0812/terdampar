import * as THREE from 'three'; import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const cyl = (r0, r1, h, y = 0, seg = 8) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(0, y, 0); return g; };
const norm = a => mergeGeometries(a.map(g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; }));
export class ItemMeshes {
  constructor(tex) {
    this.m = { wood: new THREE.MeshStandardMaterial({ map: tex.planks, color: 0xc49a6c, roughness: .8 }), stone: new THREE.MeshStandardMaterial({ map: tex.rock, roughness: .9, color: 0x9a968e }), iron: new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: .34, metalness: .95 }), rope: new THREE.MeshStandardMaterial({ color: 0xbfa878, roughness: 1 }), cloth: new THREE.MeshStandardMaterial({ color: 0x7c6a4c, roughness: 1 }), string: new THREE.MeshBasicMaterial({ color: 0xd8d0b8 }), ember: new THREE.MeshStandardMaterial({ color: 0x2a1408, emissive: 0xff6a18, emissiveIntensity: 2.4 }) };
  }
  wrap(y, r = .036, n = 5) { const a = []; for (let i = 0; i < n; i++) { const g = new THREE.TorusGeometry(r, .009, 6, 12); g.rotateX(Math.PI / 2); g.translate(0, y + i * .017, 0); a.push(g); } return norm(a); }
  make(id) {
    const G = new THREE.Group(), add = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; G.add(o); return o; }, M = this.m;
    if (id === 'axe_stone' || id === 'axe_iron') {
      add(cyl(.019, .024, .72, .22), M.wood); const iron = id === 'axe_iron';
      const s = new THREE.Shape(); s.moveTo(-.03, .05); s.lineTo(.02, .055); s.quadraticCurveTo(.13, .09, .18, .13); s.lineTo(.18, -.1); s.quadraticCurveTo(.12, -.06, .02, -.05); s.lineTo(-.03, -.045); s.closePath(); const h = new THREE.ExtrudeGeometry(s, { depth: iron ? .03 : .05, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 1 }); h.translate(0, 0, iron ? -.015 : -.025); h.translate(0, .49, 0); add(h, iron ? M.iron : M.stone); add(this.wrap(.44), M.rope);
    } else if (id === 'pick_stone' || id === 'pick_iron') {
      add(cyl(.019, .024, .76, .24), M.wood); const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.27, .46, 0), new THREE.Vector3(0, .58, 0), new THREE.Vector3(.27, .46, 0)); const g = new THREE.TubeGeometry(c, 14, .022, 6, false); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = Math.abs(p.getX(i)) / .27; const ctr = .46 + .12 * (1 - t * t), f = 1 - t * .82 + .08; p.setY(i, ctr + (p.getY(i) - ctr) * f * 1.3); p.setZ(i, p.getZ(i) * f * 1.3); } g.computeVertexNormals(); add(g, id === 'pick_iron' ? M.iron : M.stone); add(this.wrap(.47), M.rope);
    } else if (id === 'rod') { add(cyl(.006, .02, 2.1, .85), M.wood); add(this.wrap(-.05, .026, 3), M.rope); const r = new THREE.TorusGeometry(.04, .012, 6, 12); r.rotateY(Math.PI / 2); r.translate(.03, .18, 0); add(r, M.iron); }
    else if (id === 'hammer') { add(cyl(.018, .022, .46, .1), M.wood); const b = new THREE.BoxGeometry(.2, .1, .1); b.translate(0, .33, 0); add(b, M.stone); add(this.wrap(.26), M.rope); }
    else if (id === 'spear') { add(cyl(.017, .02, 1.9, .3), M.wood); const t = new THREE.ConeGeometry(.038, .24, 5); t.scale(1, 1, .45); t.translate(0, 1.36, 0); add(t, M.stone); add(this.wrap(1.2, .03), M.rope); }
    else if (id === 'torch') { add(cyl(.022, .03, .56, .1), M.wood); const g = cyl(.05, .04, .15, .42); add(g, M.ember); add(this.wrap(.33, .042, 4), M.cloth); G.userData.flame = new THREE.Vector3(0, .5, 0); }
    else if (id === 'bow') { const c = new THREE.CatmullRomCurve3([[-.04, -.62, 0], [.05, -.42, 0], [.1, -.15, 0], [.1, 0, 0], [.1, .15, 0], [.05, .42, 0], [-.04, .62, 0]].map(p => new THREE.Vector3(...p))); add(new THREE.TubeGeometry(c, 30, .012, 6, false), M.wood); const ln = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.04, -.62, 0), new THREE.Vector3(-.05, 0, 0), new THREE.Vector3(-.04, .62, 0)]); G.add(new THREE.Line(ln, M.string)); add(this.wrap(-.05, .016, 4), M.rope); }
    else return null; return G;
  }
}
export const HOLD = { // transform in hand_r space
  default: { p: [0, .06, .02], r: [0, 0, 0], s: 1 }, spear: { p: [0, .06, .02], r: [0, 0, 0], s: 1 }, bow: { p: [0, .05, .02], r: [0, 0, 0], s: 1 } };
