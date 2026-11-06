import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Terrain } from './terrain.js'; import { Sky, skyParams } from './sky.js'; import { Ocean } from './ocean.js'; import { Forest, Decor, loadNature } from './forest.js';
export const QUALITY = {
  low: { tier: 0, dpr: 1.25, post: false, shadow: 1024, shadowR: 36, shadowEvery: 3, terrainRes: 32, lodDist: [100, 210, 400], nearR: 18, midR: 60, farR: 400, propR: 44, treeCap: 26, midCap: 90, farCap: 1300, grassR: 20, grassCap: 2600, grassPerCell: 20, decorR: 24, decorCap: 24, fog: 1.7 },
  med: { tier: 1, dpr: 1, post: true, shadow: 2048, shadowR: 70, terrainRes: 64, lodDist: [170, 340, 650], nearR: 40, midR: 130, farR: 800, propR: 90, treeCap: 70, midCap: 260, farCap: 5000, grassR: 48, grassCap: 18000, grassPerCell: 50, decorR: 60, decorCap: 110, fog: 1 },
  high: { tier: 2, dpr: 1.5, post: true, shadow: 4096, shadowR: 95, terrainRes: 64, lodDist: [230, 460, 800], nearR: 55, midR: 170, farR: 1000, propR: 130, treeCap: 110, midCap: 420, farCap: 7500, grassR: 70, grassCap: 42000, grassPerCell: 74, decorR: 85, decorCap: 180, fog: 1 } };
export function autoQuality() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
  if (mobile) return 'low'; try { const g = document.createElement('canvas').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); const r = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; if (/swiftshader|llvmpipe/i.test(r)) return 'med'; if (/intel|uhd|iris|vega|radeon\(tm\) graphics/i.test(r) && !/arc/i.test(r)) return 'med'; } catch { } return 'high';
}
const FINAL = { uniforms: { tDiffuse: { value: null }, uExposure: { value: 1 }, uUnder: { value: 0 }, uTime: { value: 0 }, uHurt: { value: 0 }, uFadeB: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader: /*glsl*/`
 uniform sampler2D tDiffuse; uniform float uExposure,uUnder,uTime,uHurt,uFadeB; varying vec2 vUv;
 vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
 void main(){ vec2 uv=vUv; if(uUnder>.5){uv+=vec2(sin(uv.y*28.+uTime*2.1),cos(uv.x*24.+uTime*1.7))*.0035;}
  vec3 c=texture2D(tDiffuse,uv).rgb*uExposure;
  if(uUnder>.5){c=mix(c,vec3(.02,.2,.27)*(.5+dot(c,vec3(.3))),.62);}
  c=aces(c*.92);
  // grade: warm highlights, cool shadows, a little saturation
  float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,1.14); c+=vec3(.012,.004,-.012)*smoothstep(.35,.9,l); c+=vec3(-.006,.0,.016)*(1.-smoothstep(.0,.42,l));
  c=pow(max(c,0.),vec3(1./2.2));
  vec2 q=vUv-.5; float v=1.-dot(q,q)*.5; c*=v;
  float g=fract(sin(dot(vUv*vec2(1920.,1080.)+uTime,vec2(12.9898,78.233)))*43758.5453); c+=(g-.5)*.012;
  c=mix(c,vec3(.45,.02,.02),uHurt*smoothstep(.15,.75,length(q)*1.5)); c*=1.-uFadeB;
  gl_FragColor=vec4(c,1.);}`};
export class GameScene {
  constructor(canvas, world, qName) {
    this.world = world; this.qName = qName; const q = this.q = QUALITY[qName];
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !q.post, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(Math.min(devicePixelRatio, q.dpr)); r.setSize(innerWidth, innerHeight, false); r.shadowMap.enabled = true; if (q.shadowEvery) r.shadowMap.autoUpdate = false; this.sf = 0; this.shadowEvery = q.shadowEvery || 1; r.shadowMap.type = THREE.PCFShadowMap; r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = q.post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1; 
    this.scene = new THREE.Scene(); this.fog = this.scene.fog = new THREE.FogExp2(0xbfd9ea, .00075 * q.fog);
    this.vmScene = new THREE.Scene(); this.vmScene.fog = null;
    this.shared = { uTime: { value: 0 }, uWind: { value: 1 }, uWet: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColW: { value: new THREE.Color() } };
    this.time = .36; this.rain = 0; this.cover = .55; this.env = null; this.envT = 1e9; this.hurt = 0; this.black = 0;
    this.entityVisual = { palm: e => 'palm_' + (e.id % 3 + 1), rock_1: 'rock_1', rock_2: 'rock_2', rock_3: 'rock_3', rock_4: 'rock_4', boulder_1: 'boulder_1', boulder_2: 'boulder_2', berry: 'bush_flower', fiber: e => ['plant_1', 'plant_7b', 'plant_5'][e.id % 3], shroom: 'shroom', shroom_red: 'shroom_red', ore: 'ore' };
    for (const n of ['common_1', 'common_2', 'common_3', 'common_4', 'common_5', 'tall_1', 'tall_2', 'tall_3', 'tall_4', 'tall_5', 'twisted_1', 'twisted_2', 'twisted_3', 'pine_1', 'pine_2', 'pine_3', 'pine_4', 'dead_1', 'dead_2', 'dead_3', 'dead_4', 'dead_5']) this.entityVisual['tree_' + n] = 'tree_' + n;
  }
  async load(progress) {
    const r = this.renderer, tl = new THREE.TextureLoader(), an = r.capabilities.getMaxAnisotropy(), q = this.q;
    const T = (u, srgb = true, rep = true) => tl.loadAsync(u).then(t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = q.tier >= 1 ? Math.min(8, an) : 2; return t; });
    const names = ['sand', 'grass', 'forest', 'rock', 'planks', 'planks2', 'bark', 'stone', 'leather']; const tex = this.tex = { nature: {} }; let done = 0, tot = names.length * 2 + 22; const tick = () => progress && progress(++done / tot);
    await Promise.all(names.map(async n => { tex[n] = await T(`assets/tex/${n}.jpg`); tick(); tex[n + 'N'] = await T(`assets/tex/${n}_n.jpg`, false); tick(); }));
    tex.waterN = await T('assets/tex/waterN.png', false); tex.normal = await T('world/normal.png', false, false); tex.splat = await T('world/splat.png', false, false); tex.normal.anisotropy = tex.splat.anisotropy = 1;
    for (const n of ['Leaves_NormalTree', 'Leaves_TallThick', 'Leaves_TwistedTree', 'Leaf_Pine', 'Leaves', 'Grass', 'Flowers']) { tex.nature[n] = await T(`assets/nature/${n}.png`); tick(); }
    for (const n of ['Bark_NormalTree', 'Bark_PineTree', 'Bark_TwistedTree', 'Bark_DeadTree', 'Rocks_Diffuse', 'Mushrooms']) { tex.nature[n] = await T(`assets/nature/${n}.jpg`); tick(); if (n.startsWith('Bark')) tex.nature[n + '_Normal'] = await T(`assets/nature/${n}_Normal.jpg`, false); }
    this.nature = await loadNature(tex); tick();
    // splat readback for ground cover
    const c = document.createElement('canvas'); c.width = tex.splat.image.width; c.height = tex.splat.image.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(tex.splat.image, 0, 0); const sp = { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
    const s = this.scene, sh = this.shared;
    this.terrain = new Terrain(this.world, tex, sh, q); s.add(this.terrain.group);
    this.sky = new Sky(tex, sh, q); s.add(this.sky.mesh);
    this.ocean = new Ocean(this.world, this.terrain.uniforms, tex, sh, q); s.add(this.ocean.group);
    this.forest = new Forest(s, this.world, this.nature, tex, sh, q, r);
    this.decor = new Decor(s, this.world, this.forest, sp, sh, q);
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(q.shadow, q.shadow); const R = q.shadowR; Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 700 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .06; s.add(sun, sun.target);
    const hemi = this.hemi = new THREE.HemisphereLight(0xffffff, 0x665b48, 1); s.add(hemi);
    this.vmSun = new THREE.DirectionalLight(0xffffff, 2); this.vmHemi = new THREE.HemisphereLight(0xffffff, 0x665b48, 1); this.vmScene.add(this.vmSun, this.vmHemi);
    this.pmrem = new THREE.PMREMGenerator(r); this.envScene = new THREE.Scene(); const envMesh = new THREE.Mesh(this.sky.mesh.geometry, this.sky.mesh.material); envMesh.scale.setScalar(50); this.envScene.add(envMesh);
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .08, 4500);
    this.vmCam = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .02, 12);
    if (q.post) {
      const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: q.tier >= 2 ? 4 : 2 });
      const cp = this.composer = new EffectComposer(r, rt); cp.setPixelRatio(Math.min(devicePixelRatio, q.dpr)); cp.setSize(innerWidth, innerHeight);
      cp.addPass(new RenderPass(s, this.camera));
      const vp = this.vmPass = new RenderPass(this.vmScene, this.vmCam); vp.clear = false; vp.clearDepth = true; cp.addPass(vp);
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .22, .62, .96); cp.addPass(this.bloom);
      this.final = new ShaderPass(FINAL); cp.addPass(this.final);
    }
    addEventListener('resize', () => this.resize()); this.resize(); this.updateEnv(0, true);
  }
  applyPerf(l) { // automatic quality ladder for slow devices
    const f = this.forest, q = this.q, k = [1, .85, .72, .62, .52][l] ?? .52; this.setScale(k); if (l >= 2) { this.shadowEvery = Math.max(this.shadowEvery, 5); this.decor.limit = .5; this.decor.last.set(1e9, 0, 0); } if (l >= 3 && this.sun.castShadow) { this.sun.castShadow = false; this.renderer.shadowMap.enabled = false; this.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); } if (l >= 4) { q.midR = Math.min(q.midR, 42); q.farR = Math.min(q.farR, 300); this.forestDirty = true; f.dirty = true; } }
  setScale(k) { const pr = Math.min(devicePixelRatio, this.q.dpr) * k; this.renderer.setPixelRatio(pr); this.composer?.setPixelRatio(pr); this.resize(); }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = this.vmCam.aspect = w / h; this.baseFov = w < h ? 92 : 70; this.vmCam.fov = w < h ? 80 : 52; this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix(); this.vmCam.updateProjectionMatrix(); this.composer?.setSize(w, h); }
  updateEnv(dt, force) {
    const p = this.env = skyParams(this.time, this.rain); const sh = this.shared; sh.uSunDir.value.copy(p.lightDir); sh.uSunColW.value.copy(p.sunColor).multiplyScalar(p.isNight ? .35 : p.sunI * .34); sh.uWet.value = this.rain;
    this.sky.apply(p, this.rain, this.cover);
    const h = this.hemi, s = this.sun; h.color.copy(p.horizon).lerp(p.zenith, .4).lerp(new THREE.Color(1, .96, .88), .34); h.groundColor.set(0x8d7c5e).multiplyScalar(.8).lerp(p.horizon, .2); h.intensity = p.ambI * (this.q.tier ? .85 : 1.3) * (1 - (this.cave || 0) * .5);
    s.color.copy(p.sunColor); s.intensity = p.sunI * (p.isNight ? .55 : 1) * Math.max(.1, Math.min(1, Math.abs(p.e) * 7)) * (1 - (this.cave || 0) * .9); sh.uWind.value = 1 + this.rain * 1.8;
    this.fog.color.copy(p.horizon).lerp(p.zenith, .12); this.fog.density = (.00062 + this.rain * .0014 + (p.isNight ? .0002 : 0)) * this.q.fog; p.fog = this.fog;
    this.vmSun.color.copy(s.color); this.vmSun.intensity = s.intensity * .8; this.vmSun.position.copy(p.lightDir); this.vmHemi.color.copy(h.color); this.vmHemi.groundColor.copy(h.groundColor); this.vmHemi.intensity = h.intensity * 1.2;
    this.envT += dt; if (force || this.envT > (this.q.tier >= 1 ? 14 : 240)) { this.envT = 0; this.envRT?.dispose(); this.envRT = this.pmrem.fromScene(this.envScene, 0, .1, 100); this.scene.environment = this.envRT.texture; this.vmScene.environment = this.envRT.texture; } this.scene.environmentIntensity = .55 * Math.max(.3, p.ambI) * (1 - (this.cave || 0) * .75); this.vmScene.environmentIntensity = this.scene.environmentIntensity;
  }
  frame(dt, opts = {}) {
    const q = this.q, cam = this.camera, sh = this.shared; sh.uTime.value += dt; this.updateEnv(dt);
    cam.updateMatrixWorld(); const p = this.env;
    this.terrain.update(cam); this.ocean.update(cam, p, this.fog); this.forest.update(cam, this.entityVisual, p); this.decor.update(cam);
    // sun shadow follows camera, snapped to texels to avoid shimmering
    const R = q.shadowR, s = this.sun, tx = R * 2 / q.shadow, a = cam.position, fwd = cam.getWorldDirection(new THREE.Vector3()), cx = a.x + fwd.x * R * .55, cz = a.z + fwd.z * R * .55, sn = 8; const bx = Math.round(cx / sn) * sn, bz = Math.round(cz / sn) * sn, by = this.world.height(bx, bz);
    s.target.position.set(bx, Math.max(by, 0), bz); s.position.copy(s.target.position).addScaledVector(p.lightDir, 320); s.target.updateMatrixWorld();
    if (this.shadowEvery > 1 && this.sun.castShadow && ++this.sf >= this.shadowEvery) { this.sf = 0; this.renderer.shadowMap.needsUpdate = true; }
    const under = this.isUnder = cam.position.y < -.05 && this.world.height(cam.position.x, cam.position.z) < -.1;
    if (under) { this.fog.color.set(0x0d4a58); this.fog.density = .06; }
    if (this.composer) { const f = this.final.uniforms; f.uExposure.value = 1 + (p.isNight ? .28 : 0) + (this.flash || 0) * 1.6; this.flash = Math.max(0, (this.flash || 0) - dt * 2.4); f.uUnder.value = under ? 1 : 0; f.uTime.value = sh.uTime.value; f.uHurt.value = this.hurt; f.uFadeB.value = this.black; this.bloom.strength = .2 + (p.isNight ? .25 : 0); this.composer.render(dt); }
    else { this.renderer.autoClear = true; this.renderer.render(this.scene, cam); if (this.vmScene.children.length > 2) { this.renderer.autoClear = false; this.renderer.clearDepth(); this.renderer.render(this.vmScene, this.vmCam); this.renderer.autoClear = true; } }
  }
}
