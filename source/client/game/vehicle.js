import * as THREE from 'three'; import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function norm(a) { return mergeGeometries(a.map(g => { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })); }
function tex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(...rep); return t; }
function paintTex() { return tex(1024, 512, (g, w, h) => { g.fillStyle = '#5d6b3c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${40 + Math.random() * 30},${48 + Math.random() * 30},${24 + Math.random() * 20},${Math.random() * .12})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 60, 4 + Math.random() * 26, Math.random(), 0, 7); g.fill(); } for (let i = 0; i < 130; i++) { g.strokeStyle = `rgba(214,200,170,${.05 + Math.random() * .16})`; g.lineWidth = .5 + Math.random() * 1.2; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 90, y + (Math.random() - .5) * 26); g.stroke(); } const gr = g.createLinearGradient(0, h * .7, 0, h); gr.addColorStop(0, 'rgba(92,70,44,0)'); gr.addColorStop(1, 'rgba(92,70,44,.75)'); g.fillStyle = gr; g.fillRect(0, h * .7, w, h * .3); }); }
export function makeJeep(tx) {
  const root = new THREE.Group(), paint = new THREE.MeshPhysicalMaterial({ map: paintTex(), roughness: .52, metalness: .25, clearcoat: .35, clearcoatRoughness: .5 }), dark = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: .7, metalness: .35 }), chrome = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: .22, metalness: 1 }), seat = new THREE.MeshStandardMaterial({ map: tx.leather, normalMap: tx.leatherN, color: 0x6b4a2c, roughness: .75 }), glass = new THREE.MeshPhysicalMaterial({ color: 0xbfd8e0, roughness: .05, metalness: 0, transparent: true, opacity: .28 }), wood = new THREE.MeshStandardMaterial({ map: tx.planks, normalMap: tx.planksN, roughness: .85 }), lamp = new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffe2a0, emissiveIntensity: .8, roughness: .2 });
  const add = (g, m, par = root) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; par.add(o); return o; };
  const bx = (w, h, d, x, y, z, m, b = .035) => { const s = new THREE.Shape(); const hw = w / 2, hh = h / 2; s.moveTo(-hw + b, -hh); s.lineTo(hw - b, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh + b); s.lineTo(hw, hh - b); s.quadraticCurveTo(hw, hh, hw - b, hh); s.lineTo(-hw + b, hh); s.quadraticCurveTo(-hw, hh, -hw, hh - b); s.lineTo(-hw, -hh + b); s.quadraticCurveTo(-hw, -hh, -hw + b, -hh); const g = new THREE.ExtrudeGeometry(s, { depth: d - b * 2, bevelEnabled: true, bevelSize: b * .7, bevelThickness: b, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, -d / 2 + b); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * .4 + .5, uv.getY(i) * .4 + .5); g.translate(x, y, z); return g; };
  const stage = { body: new THREE.Group(), hood: new THREE.Group(), engine: new THREE.Group(), wheels: [] }; root.add(stage.body, stage.hood, stage.engine);
  // ladder frame (always visible)
  const frame = []; for (const s of [-1, 1]) frame.push(bx(.1, .12, 3.6, s * .52, .5, 0, dark, .01)); for (const z of [-1.5, -.6, .4, 1.4]) frame.push(bx(1.1, .08, .08, 0, .5, z, dark, .01)); frame.push(bx(1.5, .1, .12, 0, .55, 1.86, dark, .01), bx(1.5, .1, .12, 0, .55, -1.86, dark, .01)); add(norm(frame), dark);
  // body tub
  const tub = []; tub.push(bx(1.56, .5, 1.5, 0, .85, -.25, paint), bx(1.56, .5, 1.1, 0, .85, -1.3, paint)); add(norm(tub), paint, stage.body);
  const hood = [bx(1.34, .32, 1.28, 0, 1.02, 1.12, paint, .06), bx(1.34, .46, .1, 0, .96, 1.78, dark, .02)]; add(norm(hood), paint, stage.hood);
  for (let i = -4; i <= 4; i++) add(bx(.06, .36, .03, i * .13, .97, 1.84, chrome, .005), chrome, stage.hood);
  for (const s of [-1, 1]) { const l = new THREE.CylinderGeometry(.13, .13, .08, 18); l.rotateX(Math.PI / 2); l.translate(s * .5, 1.08, 1.84); add(l, lamp, stage.hood); const r = new THREE.TorusGeometry(.135, .018, 8, 22); r.translate(s * .5, 1.08, 1.885); add(r, chrome, stage.hood);
    for (const z of [1.23, -1.2]) { const f = new THREE.TorusGeometry(.56, .1, 8, 18, Math.PI); f.scale(1, .84, 1.55 * .95); f.rotateY(Math.PI / 2); f.translate(s * .86, .56, z); add(f, paint, stage.body); }
    add(bx(.28, .05, 1.1, s * .92, .62, -.02, dark, .01), dark, stage.body); }
  // windscreen + roll cage
  const tube = (pts, r, m, par = stage.body) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, 8, false), m, par);
  tube([[-.72, 1.1, .36], [-.68, 1.72, .22], [.68, 1.72, .22], [.72, 1.1, .36]], .03, dark); const ws = new THREE.PlaneGeometry(1.36, .6); ws.rotateX(-.22); ws.translate(0, 1.42, .29); glass.side = THREE.DoubleSide; add(ws, glass, stage.body);
  tube([[-.74, 1.05, -.86], [-.7, 1.82, -.84], [.7, 1.82, -.84], [.74, 1.05, -.86]], .045, dark); tube([[-.7, 1.82, -.84], [-.68, 1.72, .22]], .03, dark); tube([[.7, 1.82, -.84], [.68, 1.72, .22]], .03, dark);
  // seats, wheel, dash, bed
  for (const s of [-1, 1]) { add(norm([bx(.5, .14, .5, s * .36, 1.0, -.25, seat), bx(.5, .58, .13, s * .36, 1.3, -.5, seat)]), seat, stage.body); } add(bx(1.3, .3, .1, 0, 1.15, .28, dark, .02), dark, stage.body); const sw = new THREE.TorusGeometry(.17, .02, 8, 22); sw.rotateX(-.5); const swm = add(sw, dark, stage.body); swm.position.set(-.36, 1.34, .1);
  const bed = bx(1.44, .06, 1.2, 0, 1.1, -1.32, wood); add(bed, wood, stage.body); add(norm([bx(.06, .3, 1.2, -.74, 1.25, -1.32, paint), bx(.06, .3, 1.2, .74, 1.25, -1.32, paint), bx(1.5, .3, .06, 0, 1.25, -1.94, paint)]), paint, stage.body);
  // spare on the tailgate + jerrycan
  // engine block
  add(norm([bx(.74, .42, .9, 0, .86, 1.08, dark, .03), bx(.5, .14, .7, 0, 1.12, 1.08, chrome, .02)]), dark, stage.engine);
  // wheels
  const rubber = new THREE.MeshStandardMaterial({ map: tex(256, 64, (g, w, h) => { g.fillStyle = '#17171a'; g.fillRect(0, 0, w, h); g.fillStyle = '#26262b'; for (let i = 0; i < 24; i++) { g.fillRect(i * w / 24, 0, w / 48, h); } }), roughness: .92 });
  const wheelG = () => { const g = new THREE.Group(); const t = new THREE.CylinderGeometry(.42, .42, .3, 24, 1); t.rotateZ(Math.PI / 2); const tm = new THREE.Mesh(t, rubber); tm.castShadow = true; g.add(tm); const r = new THREE.CylinderGeometry(.23, .23, .32, 16); r.rotateZ(Math.PI / 2); g.add(new THREE.Mesh(r, chrome)); for (let i = 0; i < 6; i++) { const b = new THREE.CylinderGeometry(.018, .018, .34, 6); b.rotateZ(Math.PI / 2); const a = i / 6 * 6.283; b.translate(0, Math.cos(a) * .15, Math.sin(a) * .15); g.add(new THREE.Mesh(b, dark)); } return g; };
  for (const [x, z] of [[-.86, 1.23], [.86, 1.23], [-.86, -1.2], [.86, -1.2]]) { const piv = new THREE.Group(); piv.position.set(x, .44, z); const w = wheelG(); piv.add(w); piv.userData.w = w; root.add(piv); stage.wheels.push(piv); }
  root.userData = { stage, swm };
  const hl = new THREE.SpotLight(0xffeec8, 0, 46, .5, .6, 1.2); hl.position.set(0, 1.1, 1.9); hl.target.position.set(0, .4, 12); root.add(hl, hl.target); root.userData.hl = hl;
  return root;
}
export function setJeepStage(o, v) { const s = o.userData.stage; s.engine.visible = !!v.engine; s.hood.visible = !!v.engine; s.body.visible = true; s.wheels.forEach((w, i) => { w.visible = i < v.wheels; }); }
// arcade drive model: heightfield + four sampled contact points
export class BoatPhysics {
  constructor(world) { this.w = world; this.t = 0; this.speed = 0; this.steer = 0; this.crash = 0; }
  init(v) { this.x = v.x; this.y = v.y; this.z = v.z; this.yaw = v.yaw || 0; this.pitch = 0; this.roll = 0; this.speed = 0; }
  step(dt, inp) { const w = this.w; this.t += dt; this.steer += (inp.x - this.steer) * Math.min(1, dt * 3); this.speed += inp.y * 5.5 * dt; this.speed -= this.speed * .55 * dt; this.speed = Math.max(-3, Math.min(11, this.speed)); this.yaw -= this.steer * (.5 + Math.min(.7, Math.abs(this.speed) * .12)) * dt; const nx = this.x + Math.sin(this.yaw) * this.speed * dt, nz = this.z + Math.cos(this.yaw) * this.speed * dt, lv = w.waterLevel(nx, nz), depth = lv === null ? 0 : lv - w.height(nx, nz); if (depth < .5) this.speed *= -.3; else { this.x = nx; this.z = nz; } const l0 = w.waterLevel(this.x, this.z) ?? 0; this.y = l0 + .06 + Math.sin(this.t * 1.3) * .06; this.pitch = Math.sin(this.t * .9) * .025; this.roll = Math.sin(this.t * 1.1) * .035 - this.steer * .05; return { burn: 0 }; }
}
export class CarPhysics {
  constructor(world, S, isDead) { this.w = world; this.S = S; this.isDead = isDead; this.vel = new THREE.Vector3(); this.speed = 0; this.vy = 0; this.steer = 0; }
  init(v) { this.x = v.x; this.y = v.y; this.z = v.z; this.yaw = v.yaw; this.pitch = v.pitch || 0; this.roll = v.roll || 0; this.speed = 0; this.vy = 0; }
  step(dt, inp, fuel) {
    const w = this.w; let thr = inp.y; if (fuel <= 0) thr = 0; const ground = w.height(this.x, this.z), wlv = w.waterLevel(this.x, this.z), depth = wlv !== null ? wlv - ground : 0; const cs = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    this.steer += (inp.x - this.steer) * Math.min(1, dt * 5); const max = thr >= 0 ? 34 : 12, acc = thr >= 0 ? 11 : 16;
    if (depth > 1.1) thr *= .1; this.speed += thr * acc * dt; const onSand = ground < 3.4; const drag = (.32 + (onSand ? .22 : 0) + (depth > .3 ? 1.6 : 0)) * dt; this.speed -= this.speed * drag; if (!thr) this.speed -= this.speed * dt * .5; this.speed = Math.max(-max, Math.min(max, this.speed));
    const slip = Math.min(1, Math.abs(this.speed) / 8); this.yaw -= this.steer * (.95 - Math.min(.55, Math.abs(this.speed) / 60)) * slip * dt * Math.sign(this.speed || 1) * 1.4;
    let nx = this.x + Math.sin(this.yaw) * this.speed * dt, nz = this.z + Math.cos(this.yaw) * this.speed * dt;
    // obstacles
    const c = this.hitObs(nx, nz); if (c) { const nl = Math.hypot(nx - c.x, nz - c.z) || 1, push = c.r + 1.3; nx = c.x + (nx - c.x) / nl * push; nz = c.z + (nz - c.z) / nl * push; const hit = Math.abs(this.speed); this.speed *= -.25; this.crash = hit; }
    const o = {}; if (this.S.collide(nx, nz, this.y - .3, 1.6, 1.25, o)) { nx = o.x; nz = o.z; this.speed *= .5; }
    this.x = nx; this.z = nz;
    const fl = 1.25, hw = .85, pts = [[-hw, fl], [hw, fl], [-hw, -fl], [hw, -fl]].map(([a, b]) => { const px = this.x + a * Math.cos(this.yaw) + b * Math.sin(this.yaw), pz = this.z - a * Math.sin(this.yaw) + b * Math.cos(this.yaw); return Math.max(w.height(px, pz), this.S.floorAt(px, pz, this.y, 1.1)); });
    const front = (pts[0] + pts[1]) / 2, back = (pts[2] + pts[3]) / 2, left = (pts[0] + pts[2]) / 2, right = (pts[1] + pts[3]) / 2, avg = (front + back) / 2 + .08;
    if (this.y > avg + .06) { this.vy -= 18 * dt; this.y += this.vy * dt; if (this.y < avg) { this.y = avg; this.vy = 0; } } else { this.vy = Math.max(0, (avg - this.y) / Math.max(dt, .001) * .4); this.y += (avg - this.y) * Math.min(1, dt * 16); }
    const tp = Math.atan2(front - back, fl * 2), tr = Math.atan2(right - left, hw * 2), k = Math.min(1, dt * 8); this.pitch += (tp - this.pitch) * k; this.roll += (tr - this.roll) * k;
    const slope = Math.sin(this.pitch); this.speed -= slope * 9 * dt; return { burn: Math.abs(thr) * dt * .28 };
  }
  hitObs(x, z) { let hit = null; this.w.forNear(x, z, 3, e => { const r = e.type.startsWith('tree') ? .6 * e.s : e.type === 'palm' ? .34 : e.type.startsWith('rock') || e.type === 'ore' ? .8 * e.s : e.type.startsWith('boulder') ? 2.4 * e.s : 0; if (!r || this.isDead(e.id)) return; if (Math.hypot(x - e.x, z - e.z) < r + 1.2) hit = { x: e.x, z: e.z, r }; }); for (const c of this.w.pois.caves || []) if (Math.hypot(x - c.x, z - c.z) < c.r + 1.2) hit = { x: c.x, z: c.z, r: c.r }; return hit; }
}
