import * as THREE from 'three';
// CPU sim, GPU points. Two blend modes share the same pool logic.
class Pool {
  constructor(scene, cap, blending, tex) {
    this.cap = cap; this.p = new Float32Array(cap * 3); this.c = new Float32Array(cap * 4); this.s = new Float32Array(cap); this.v = new Float32Array(cap * 3); this.l = new Float32Array(cap * 2); this.d = new Float32Array(cap * 2); this.i = 0;
    const g = this.g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(this.c, 4).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('size', new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending, uniforms: { uS: { value: innerHeight * .9 } }, vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float uS; void main(){vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*uS/-mv.z; gl_Position=projectionMatrix*mv;}`, fragmentShader: `varying vec4 vC; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,.15,d); gl_FragColor=vec4(vC.rgb,vC.a*a); }` });
    this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; this.pts.renderOrder = 8; scene.add(this.pts);
  }
  emit(x, y, z, vx, vy, vz, r, g, b, a, size, life, grow = 0, grav = 0) { const i = this.i = (this.i + 1) % this.cap; this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z; this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz; this.c[i * 4] = r; this.c[i * 4 + 1] = g; this.c[i * 4 + 2] = b; this.c[i * 4 + 3] = a; this.s[i] = size; this.l[i * 2] = life; this.l[i * 2 + 1] = life; this.d[i * 2] = grow; this.d[i * 2 + 1] = grav; this.a0 = 1; this.c0 = this.c0 || new Float32Array(this.cap); this.c0[i] = a; }
  update(dt) { if (!this.c0) return; const { p, v, c, s, l, d, c0, cap } = this; for (let i = 0; i < cap; i++) { const t = l[i * 2]; if (t <= 0) { if (c[i * 4 + 3] !== 0) { c[i * 4 + 3] = 0; s[i] = 0; } continue; } l[i * 2] = t - dt; v[i * 3 + 1] -= d[i * 2 + 1] * dt; p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt; s[i] += d[i * 2] * dt; const f = t / l[i * 2 + 1]; c[i * 4 + 3] = c0[i] * Math.min(1, f * 1.6) * Math.min(1, (1 - f) * 8 + .2); } const g = this.g; g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true; }
}
const r = (a, b) => a + Math.random() * (b - a);
export class FX {
  constructor(scene, shared, q) {
    this.scene = scene; this.q = q; this.add = new Pool(scene, q.tier ? 900 : 300, THREE.AdditiveBlending); this.alpha = new Pool(scene, q.tier ? 900 : 300, THREE.NormalBlending); this.lights = []; for (let i = 0; i < (q.tier >= 1 ? 4 : 2); i++) { const l = new THREE.PointLight(0xff8a3c, 0, 26, 1.8); scene.add(l); this.lights.push(l); }
    // rain streaks
    const n = q.tier >= 1 ? 3200 : 900, v = new Float32Array(n * 6), rnd = new Float32Array(n * 2); for (let i = 0; i < n; i++) { const x = Math.random() * 60 - 30, y = Math.random() * 40, z = Math.random() * 60 - 30; v.set([x, y, z, x + .03, y + .9, z], i * 6); rnd[i * 2] = rnd[i * 2 + 1] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.rainU = { uT: shared.uTime, uA: { value: 0 }, uC: { value: new THREE.Vector3() } };
    this.rain = new THREE.LineSegments(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: this.rainU, vertexShader: `attribute float rnd; uniform float uT; uniform vec3 uC; varying float vA; void main(){ vec3 p=position; p.y=mod(p.y-uT*(26.+rnd*10.)*1.,40.)-8.; p.x+=uC.x-mod(uC.x+30.,60.)+30.; p.z+=uC.z-mod(uC.z+30.,60.)+30.; p.x=p.x; p.y+=uC.y; p.x+=p.y*.05; vA=.18+rnd*.28; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`, fragmentShader: `uniform float uA; varying float vA; void main(){gl_FragColor=vec4(.8,.88,.98,vA*uA);}` })); this.rain.frustumCulled = false; this.rain.renderOrder = 9; scene.add(this.rain);
    this.t = 0;
  }
  burst(k, x, y, z) {
    const A = this.alpha, P = this.add;
    if (k === 'chip') for (let i = 0; i < 14; i++) A.emit(x + r(-.2, .2), y + r(-.2, .2), z + r(-.2, .2), r(-3, 3), r(1, 5), r(-3, 3), .55, .38, .2, 1, .09, r(.4, .8), 0, 14);
    else if (k === 'spark') { for (let i = 0; i < 12; i++) P.emit(x, y, z, r(-5, 5), r(1, 6), r(-5, 5), 1.6, 1.0, .4, 1, .06, r(.15, .4), 0, 16); for (let i = 0; i < 8; i++) A.emit(x, y, z, r(-2, 2), r(.5, 3), r(-2, 2), .5, .5, .52, .7, .14, r(.4, .7), .4, 8); }
    else if (k === 'blood' || k === 'bite') for (let i = 0; i < 18; i++) A.emit(x, y, z, r(-2.4, 2.4), r(.5, 3.8), r(-2.4, 2.4), .42, .03, .03, .95, .1, r(.3, .6), .1, 12);
    else if (k === 'fell' || k === 'build' || k === 'install') for (let i = 0; i < 26; i++) A.emit(x + r(-1, 1), y + r(0, 1.5), z + r(-1, 1), r(-1.2, 1.2), r(.2, 1.6), r(-1.2, 1.2), .72, .66, .55, .14, .35, r(.5, .9), .6, 0);
    else if (k === 'pick') for (let i = 0; i < 8; i++) P.emit(x, y, z, r(-1, 1), r(.6, 2.2), r(-1, 1), .9, 1.0, .6, .8, .05, r(.3, .6), 0, 3);
    else if (k === 'splash') for (let i = 0; i < 24; i++) A.emit(x + r(-.4, .4), y, z + r(-.4, .4), r(-2, 2), r(1.5, 4.5), r(-2, 2), .85, .95, 1, .7, .12, r(.3, .7), .2, 12);
    else if (k === 'dust') A.emit(x, y, z, r(-.6, .6), r(.2, .8), r(-.6, .6), .74, .66, .52, .22, .8, r(.5, 1.1), 2, 0);
  }
  fire(x, y, z, s = 1, dt = .016) { const n = Math.ceil(dt * 90 * s); for (let i = 0; i < n; i++) { const t = Math.random(); this.add.emit(x + r(-.26, .26) * s, y + r(0, .1), z + r(-.26, .26) * s, r(-.2, .2), r(1.1, 2.3) * s, r(-.2, .2), 2.6 - t, 1 - t * .5, .18, .55, r(.22, .46) * s, r(.3, .62), -.3, 0); } if (Math.random() < dt * 22) this.alpha.emit(x + r(-.15, .15), y + 1.2 * s, z + r(-.15, .15), r(-.15, .3), r(.9, 1.5), r(-.15, .3), .12, .12, .13, .16, .5, r(1.4, 2.6), .7, 0); if (Math.random() < dt * 8) this.add.emit(x, y + .4, z, r(-.8, .8), r(1.5, 3.6), r(-.8, .8), 2.4, 1, .3, 1, .035, r(.5, 1.1), 0, .6); }
  smoke(x, y, z, dt) { if (Math.random() < dt * 14) this.alpha.emit(x + r(-.7, .7), y, z + r(-.7, .7), r(.1, .5), r(1.1, 2.1), r(-.2, .2), .14, .14, .15, .22, r(1, 1.8), r(3, 5), 1, 0); }
  setLights(list) { this.lights.forEach((l, i) => { const f = list[i]; if (f) { l.position.set(f.x, f.y, f.z); l.intensity = f.i * (1 + Math.sin(this.t * 13 + i) * .1 + Math.sin(this.t * 31 + i * 3) * .06); } else l.intensity = 0; }); }
  update(dt, cam, rain) { this.t += dt; this.add.update(dt); this.alpha.update(dt); this.rainU.uA.value = rain; this.rainU.uC.value.copy(cam.position); this.rain.visible = rain > .02; }
}
