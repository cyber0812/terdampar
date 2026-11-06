import * as THREE from 'three'; import { getBin } from './bin.js';
// ---- foliage shader helper
export function patchFoliage(mat, shared, opts = {}) {
  const { wind = 1, inflate = 0, sphere = 0, trans = .5, fade = 0, center = 3.2 } = opts;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = shared.uTime; sh.uniforms.uWind = shared.uWind; sh.uniforms.uSunDirW = shared.uSunDir; sh.uniforms.uSunColW = shared.uSunColW; sh.uniforms.uFade = { value: fade };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
 uniform float uTime,uWind,uFade; uniform vec3 uSunDirW; attribute vec3 aC; varying float vAO; varying vec3 vWN;`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal=vec3(normal);
 ${sphere ? `objectNormal=normalize(mix(objectNormal,normalize(position-vec3(0.,${center.toFixed(2)},0.)),${sphere.toFixed(2)}));` : ''}`)
      .replace('#include <begin_vertex>', /*glsl*/`vec3 transformed=vec3(position);
 ${inflate ? `transformed=aC+(position-aC)*${inflate.toFixed(2)};` : ''}
 vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.); float ph=ip.x*.13+ip.z*.17;
 float hh=max(transformed.y,0.);
 ${wind ? `float sw=sin(uTime*1.3+ph)*.5+sin(uTime*2.1+ph*1.7+hh*.4)*.3; float fl=sin(uTime*5.+transformed.x*3.+transformed.z*2.7)*.035*${wind.toFixed(2)};
 transformed.x+=(sw*.012*hh*hh*${wind.toFixed(3)}+fl*hh*.4)*uWind; transformed.z+=(cos(uTime*1.1+ph)*.008*hh*hh*${wind.toFixed(3)}+fl*hh*.3)*uWind;` : ''}
 ${fade ? `float fd=distance(ip.xz,cameraPosition.xz); transformed*=smoothstep(uFade,uFade*.72,fd);` : ''}
 vWN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
 uniform vec3 uSunDirW,uSunColW; varying vec3 vWN;`).replace('#include <map_fragment>', `#include <map_fragment>
 diffuseColor.rgb*=vec3(${(opts.mul||[1,1,1]).map(v=>v.toFixed(2)).join(',')});`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
 { vec3 V=normalize(vViewPosition); vec3 Lv=normalize((viewMatrix*vec4(uSunDirW,0.)).xyz); float tr=pow(clamp(dot(-V,-Lv)*.5+.5,0.,1.),5.)*1.4+clamp(dot(normal,-Lv),0.,1.)*.35;
   reflectedLight.indirectDiffuse+=diffuseColor.rgb*uSunColW*tr*${trans.toFixed(2)}*vec3(1.05,1.15,.6); }`);
  };
  mat.customProgramCacheKey = () => `fol${wind}${inflate}${sphere}${trans}${fade}${center}${opts.mul||''}`;
  return mat;
}
// ---- palm
function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export function frondTexture() {
  return canvasTex(256, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h); const cx = w / 2;
    for (let i = 0; i < 74; i++) { const t = i / 74, y = h * .985 - t * h * .97, l = (Math.sin(Math.min(1, t * 1.2 + .12) * Math.PI) * .86 + .1) * w * .5, ang = .34 + t * .3;
      for (const s of [-1, 1]) { const ex = cx + s * l * Math.cos(ang) * 1.05, ey = y - l * Math.sin(ang) * 1.5; const hue = 88 + Math.random() * 24, li = 24 + Math.random() * 12 + t * 8;
        g.fillStyle = `hsl(${hue},${52 + Math.random() * 14}%,${li}%)`; g.beginPath(); g.moveTo(cx, y + 6); g.quadraticCurveTo(cx + s * l * .5, y - l * .34, ex, ey); g.quadraticCurveTo(cx + s * l * .45, y - l * .1, cx, y - 8); g.fill(); } }
    const gr = g.createLinearGradient(cx - 5, 0, cx + 5, 0); gr.addColorStop(0, '#4d5b22'); gr.addColorStop(.5, '#bfc178'); gr.addColorStop(1, '#4d5b22'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 4.5, h); g.lineTo(cx + 4.5, h); g.lineTo(cx + 1, 8); g.lineTo(cx - 1, 8); g.fill();
  });
}
function palmGeometry(seedA) {
  const R = (() => { let s = seedA * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const tv = [], tn = [], tu = [], ti = [], fv = [], fn = [], fu = [], fi = [], fc = [];
  const H = 9 + R() * 3, lean = 1.5 + R() * 2.2, leanA = R() * 6.28, seg = 12, rad = 6; const axis = t => new THREE.Vector3(Math.cos(leanA) * lean * t * t, H * t, Math.sin(leanA) * lean * t * t);
  for (let i = 0; i <= seg; i++) { const t = i / seg, p = axis(t), r = (.34 * (1 - t) + .15) * (1 + .5 * Math.exp(-t * 14)); for (let k = 0; k <= rad; k++) { const a = k / rad * 6.283, c = Math.cos(a), s = Math.sin(a); tv.push(p.x + c * r, p.y, p.z + s * r); tn.push(c, 0, s); tu.push(k / rad * 2, t * H * .55); } }
  for (let i = 0; i < seg; i++) for (let k = 0; k < rad; k++) { const a = i * (rad + 1) + k, b = a + rad + 1; ti.push(a, b, a + 1, a + 1, b, b + 1); }
  const top = axis(1), fronds = 11 + (R() * 4 | 0);
  for (let f = 0; f < fronds; f++) { const az = f / fronds * 6.283 + R() * .4, len = 4.2 + R() * 1.8, wid = 1.25 + R() * .3, up = .52 + R() * .75, droop = .85 + R() * .5, S = 7, base = fv.length / 3; const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let i = 0; i <= S; i++) { const t = i / S, x = len * t, y = up * x * (1 - t * .15) - droop * (x * x) * .1 * (1 + t), ctr = top.clone().addScaledVector(dir, x * .95 + .1).add(new THREE.Vector3(0, y, 0)), w = wid * (i == S ? .1 : 1) * Math.min(1, .35 + t * 2.4); const fold = .34;
      for (const [s, v] of [[-1, 0], [0, .5], [1, 1]]) { const off = side.clone().multiplyScalar(s * w * .5); fv.push(ctr.x + off.x, ctr.y + off.y - Math.abs(s) * w * fold * .5, ctr.z + off.z); fu.push(v, t); fn.push(s * .3, 1, 0); fc.push(ctr.x, ctr.y, ctr.z); } }
    for (let i = 0; i < S; i++) for (let k = 0; k < 2; k++) { const a = base + i * 3 + k, b = a + 3; fi.push(a, b, a + 1, a + 1, b, b + 1); } }
  const trunk = new THREE.BufferGeometry(); trunk.setAttribute('position', new THREE.Float32BufferAttribute(tv, 3)); trunk.setAttribute('normal', new THREE.Float32BufferAttribute(tn, 3)); trunk.setAttribute('uv', new THREE.Float32BufferAttribute(tu, 2)); trunk.setIndex(ti);
  const leaf = new THREE.BufferGeometry(); leaf.setAttribute('position', new THREE.Float32BufferAttribute(fv, 3)); leaf.setAttribute('normal', new THREE.Float32BufferAttribute(fn, 3)); leaf.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2)); leaf.setAttribute('aC', new THREE.Float32BufferAttribute(fc, 3)); leaf.setIndex(fi);
  return { trunk, leaf };
}
// ---- library of static instanced models
export async function loadNature(tex) {
  const [json, bin] = await Promise.all([fetch('assets/nature/nature.json').then(r => r.json()), getBin('assets/nature/nature.bin')]);
  const out = {};
  for (const [id, m] of Object.entries(json)) {
    out[id] = m; m.geos = m.parts.map(p => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bin, p.pos, p.n * 3), 3));
      const nor = new Int8Array(bin, p.nor, p.n * 4); const inter = new THREE.InterleavedBuffer(nor, 4);
      g.setAttribute('normal', new THREE.InterleavedBufferAttribute(inter, 3, 0, true)); g.setAttribute('ao', new THREE.InterleavedBufferAttribute(inter, 1, 3, true));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(bin, p.uv, p.n * 2), 2));
      g.setIndex(new THREE.BufferAttribute(p.i32 ? new Uint32Array(bin, p.idx, p.i) : new Uint16Array(bin, p.idx, p.i), 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); return g;
    });
  }
  return out;
}
// shuffle leaf cards + per-vertex card centres so a low LOD can draw fewer, larger cards
function prepareLeaf(g) {
  const pos = g.attributes.position, n = pos.count, idx = g.index.array, par = new Int32Array(n).map((_, i) => i); const find = a => { while (par[a] != a) a = par[a] = par[par[a]]; return a; };
  for (let i = 0; i < idx.length; i += 3) { const a = find(idx[i]), b = find(idx[i + 1]), c = find(idx[i + 2]); par[b] = a; par[c] = a; }
  const sum = new Map(); for (let i = 0; i < n; i++) { const r = find(i); let s = sum.get(r); if (!s) sum.set(r, s = [0, 0, 0, 0]); s[0] += pos.getX(i); s[1] += pos.getY(i); s[2] += pos.getZ(i); s[3]++; }
  const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const s = sum.get(find(i)); c[i * 3] = s[0] / s[3]; c[i * 3 + 1] = s[1] / s[3]; c[i * 3 + 2] = s[2] / s[3]; }
  g.setAttribute('aC', new THREE.BufferAttribute(c, 3));
  const groups = new Map(); for (let i = 0; i < idx.length; i += 3) { const r = find(idx[i]); let l = groups.get(r); if (!l) groups.set(r, l = []); l.push(idx[i], idx[i + 1], idx[i + 2]); }
  const list = [...groups.values()]; let s = 1234; for (let i = list.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1);[list[i], list[j]] = [list[j], list[i]]; }
  const nidx = new (idx.constructor)(idx.length); let o = 0; for (const l of list) { nidx.set(l, o); o += l.length; } g.setIndex(new THREE.BufferAttribute(nidx, 1)); g.userData.cards = list.length;
}
const LEAFMAP = { Leaves_NormalTree_C: 'Leaves_NormalTree', Leaves_TallThick_C: 'Leaves_TallThick', Leaves_TwistedTree_C: 'Leaves_TwistedTree', Leaf_Pine_C: 'Leaf_Pine', Leaves_GiantPine_C: 'Leaf_Pine' };
const TINT = { tree_common: [0x4f8a2a, 0x5f9a2c, 0x3f7f30, 0x6e9f32], tree_tall: [0x2f6f34, 0x3b7c33, 0x47853a, 0x2b6638], tree_twisted: [0x8a9a35, 0x6f9338, 0xa39c3a], tree_pine: [0x2c5a3a, 0x31664a, 0x28553a], bush_common: [0x4d8a2e, 0x5c9632, 0x3f7d33], bush_flower: [0x4d8a2e, 0x5c9632], bush_large: [0x3f7d33, 0x4d8a2e], bush_large_f: [0x4d8a2e], bush_long: [0x4a8531], palm: [0xffffff, 0xf4ffd8, 0xe6f8c8, 0xfff8cc], default: [0xffffff] };
function pal(id) { const k = id.replace(/_\d+$/, ''); return TINT[k] || TINT.default; }
export class Forest {
  constructor(scene, world, nature, tex, shared, q, renderer) {
    this.world = world; this.q = q; this.nature = nature; this.group = new THREE.Group(); scene.add(this.group); this.dead = new Set(); this.dirty = true; this.last = new THREE.Vector3(1e9, 0, 0); this.lastYaw = 0;
    this.mats = {}; this.tex = tex; this.shared = shared;
    const LOW = q.tier === 0, Solid = o => { if (LOW) { const { normalMap, roughness, metalness, ...r } = o; return new THREE.MeshLambertMaterial(r); } return new THREE.MeshStandardMaterial(o); }; this.Solid = Solid; const barkM = (n) => Solid({ map: tex.nature[n], normalMap: tex.nature[n + '_Normal'], roughness: .95, emissive: LOW ? 0x000000 : 0x2a2a2a, emissiveMap: LOW ? null : tex.nature[n], emissiveIntensity: 1 });
    const bm = { Bark_NormalTree: barkM('Bark_NormalTree'), Bark_PineTree: barkM('Bark_PineTree'), Bark_TwistedTree: barkM('Bark_TwistedTree'), Bark_DeadTree: barkM('Bark_DeadTree') };
    const leafDepth = (map) => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .45, side: THREE.DoubleSide });
    const leafMat = (name, opts) => { const k = name + JSON.stringify(opts); if (this.mats[k]) return this.mats[k]; const m = Solid({ map: tex.nature[name], alphaTest: .45, side: THREE.DoubleSide, roughness: .75 }); patchFoliage(m, shared, opts); m._depth = leafDepth(tex.nature[name]); return this.mats[k] = m; };
    this.leafMat = leafMat;
    // visual table: id -> parts [{geo,mat,lod1,cast}]
    this.vis = {};
    const col = new THREE.Color();
    const addVis = (id, parts, far, cap) => {
      const v = this.vis[id] = { parts: [], far, cap, tints: pal(id), size: new THREE.Vector2(1, 1) };
      for (const p of parts) {
        const mk = (geo, mat, c) => { const im = new THREE.InstancedMesh(geo, mat, c); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; im.frustumCulled = false; im.castShadow = p.cast !== false && !(LOW && c !== cap); im.receiveShadow = true; if (mat._depth) im.customDepthMaterial = mat._depth; im.setColorAt(0, col.set(0xffffff)); im.instanceColor.setUsage(THREE.DynamicDrawUsage); this.group.add(im); return im; };
        v.parts.push({ near: mk(p.geo, p.mat, cap), mid: p.geoMid ? mk(p.geoMid, p.matMid || p.mat, Math.min(cap * 3, q.midCap)) : null, leaf: !!p.leaf });
      }
    };
    for (const [id, m] of Object.entries(nature)) {
      const parts = [], tree = id.startsWith('tree_');
      m.geos.forEach((g, i) => {
        const p = m.parts[i], tname = p.tex;
        if (tree) {
          if (tname.startsWith('Bark')) { parts.push({ geo: g, mat: bm[tname], geoMid: g }); }
          else {
            prepareLeaf(g); const h = m.bmax[1], lf = LEAFMAP[tname] || 'Leaf_Pine', keep = id.startsWith('tree_pine') ? .5 : .32;
            const mid = new THREE.BufferGeometry(); for (const a in g.attributes) mid.setAttribute(a, g.attributes[a]); mid.setIndex(g.index); mid.setDrawRange(0, Math.floor(g.index.count * keep / 3) * 3); mid.boundingSphere = g.boundingSphere;
            const c = h * .62; parts.push({ leaf: 1, geo: g, mat: leafMat(lf, { wind: 1, sphere: .78, trans: .55, center: c }), geoMid: mid, matMid: leafMat(lf, { wind: 1, sphere: .78, trans: .55, center: c, inflate: 1.75 }) });
          }
        } else {
          const name = tname === 'PathRocks_Diffuse' ? 'Rocks_Diffuse' : (LEAFMAP[tname] || tname); const isLeaf = ['Leaves', 'Grass', 'Flowers', 'Leaves_NormalTree', 'Leaves_TallThick', 'Leaves_TwistedTree', 'Leaf_Pine'].includes(name);
          if (isLeaf) parts.push({ leaf: 1, geo: g, mat: leafMat(name, { wind: .5, sphere: 0, trans: .3, mul: name === 'Leaves' ? [.62, .72, .55] : name === 'Grass' ? [.7, .8, .6] : name === 'Flowers' ? [1, 1, 1] : [1, 1, 1] }), cast: false });
          else { const k = 'solid_' + name; const mat = this.mats[k] || (this.mats[k] = Solid({ map: tex.nature[name], roughness: .9 })); parts.push({ geo: g, mat, cast: id.startsWith('rock') || id.startsWith('boulder') }); }
        }
      });
      addVis(id, parts, tree, tree ? q.treeCap : 400);
      this.vis[id].size.set(m.bmax[0] - m.bmin[0], m.bmax[1] - m.bmin[1]);
    }
    // palms
    const fro = frondTexture(); const lm = Solid({ map: fro, alphaTest: .4, side: THREE.DoubleSide, roughness: .6 }); patchFoliage(lm, shared, { wind: 1.1, sphere: .35, trans: .7, center: 7 }); lm._depth = leafDepth(fro);
    const pb = Solid({ map: tex.bark, normalMap: tex.barkN, roughness: .95, color: 0xe9dcc2 });
    for (let i = 1; i <= 3; i++) { const g = palmGeometry(i * 17); addVis('palm_' + i, [{ geo: g.trunk, mat: pb, geoMid: g.trunk }, { leaf: 1, geo: g.leaf, mat: lm, geoMid: g.leaf }], true, q.treeCap); this.vis['palm_' + i].tints = TINT.palm; this.vis['palm_' + i].size.set(9, 13); }
    this.atlas(renderer, tex);
    this.m4 = new THREE.Matrix4(); this.q4 = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    this.extra = new Map(); // ad-hoc visuals registered by the game
  }
  // bake a far billboard for every tree
  atlas(renderer, tex) {
    const ids = Object.keys(this.vis).filter(k => k.startsWith('tree_') || k.startsWith('palm_')), G = 8, CS = this.q.tier >= 1 ? 256 : 128, size = G * CS;
    const rt = new THREE.WebGLRenderTarget(size, size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 300); const clr = new THREE.Color(), oldT = renderer.getRenderTarget(); const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x2a4a24, 0); renderer.clear(); renderer.autoClear = false; renderer.setScissorTest(true);
    ids.forEach((id, n) => {
      const v = this.vis[id], cx = n % G, cy = Math.floor(n / G); const bm = this.nature[id]; const w = (bm ? Math.max(bm.bmax[0] - bm.bmin[0], bm.bmax[2] - bm.bmin[2]) : 11), h = (bm ? bm.bmax[1] : 13);
      const sz = Math.max(w, h) * 1.05; v.bb = { sz, n, baseY: 0 }; cam.left = -sz / 2; cam.right = sz / 2; cam.top = sz; cam.bottom = 0; cam.near = -200; cam.far = 200; cam.position.set(0, 0, 0); cam.lookAt(0, 0, -1); cam.updateProjectionMatrix();
      sc.clear(); for (const p of v.parts) { const src = p.near, leaf = p.leaf, mt = src.material; const m = new THREE.MeshBasicMaterial({ map: mt.map, side: THREE.DoubleSide, alphaTest: leaf ? .45 : 0, color: leaf ? clr.set(v.tints[0]) : 0xffffff }); sc.add(new THREE.Mesh(src.geometry, m)); }
      renderer.setViewport(cx * CS, cy * CS, CS, CS); renderer.setScissor(cx * CS, cy * CS, CS, CS); rt.viewport.set(cx * CS, cy * CS, CS, CS); rt.scissor.set(cx * CS, cy * CS, CS, CS); rt.scissorTest = true; renderer.setRenderTarget(rt); renderer.render(sc, cam);
    });
    rt.scissorTest = false; rt.viewport.set(0, 0, size, size); rt.scissor.set(0, 0, size, size); renderer.setScissorTest(false); renderer.autoClear = true; renderer.setRenderTarget(oldT); renderer.setClearColor(cc, ca);
    const cap = this.q.farCap, g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, .5, 1, 0, -.5, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    this.bbA = new Float32Array(cap * 4); this.bbB = new Float32Array(cap * 4); const ia = new THREE.InstancedBufferAttribute(this.bbA, 4), ib = new THREE.InstancedBufferAttribute(this.bbB, 4); ia.setUsage(THREE.DynamicDrawUsage); ib.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iA', ia); g.setAttribute('iB', ib); g.instanceCount = 0; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const u = this.bbU = { tAtlas: { value: rt.texture }, uSun: this.shared.uSunDir, uSunC: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() }, uG: { value: G }, fogColor: { value: new THREE.Color() }, fogDensity: { value: .001 } };
    const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: `attribute vec4 iA,iB; varying vec2 vU; varying vec2 vQ; varying float vTint; uniform float uG;
 #include <fog_pars_vertex>
 void main(){ vec3 c=iA.xyz; float sz=iA.w; vec3 F=c-cameraPosition; F.y=0.; F=normalize(F); vec3 R=vec3(F.z,0.,-F.x); vec3 p=c+R*position.x*sz+vec3(0.,position.y*sz,0.); vQ=position.xy; float n=iB.x; vU=(vec2(mod(n,uG),floor(n/uG))+vec2(position.x+.5,position.y))/uG; vTint=iB.y; vec4 mvPosition=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`, fragmentShader: `uniform sampler2D tAtlas; uniform vec3 uSun,uSunC,uAmb; varying vec2 vU,vQ; varying float vTint;
 #include <fog_pars_fragment>
 void main(){ vec4 c=texture2D(tAtlas,vU); if(c.a<.42)discard; vec3 n=normalize(vec3(vQ.x*1.6,vQ.y-.25+.8,.7)); float l=clamp(dot(n,uSun)*.7+.3,0.,1.); gl_FragColor=vec4(c.rgb*(uAmb+uSunC*l*.55)*(.88+vTint*.3),1.);
 #include <fog_fragment>
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`, fog: true, side: THREE.DoubleSide });
    this.bb = new THREE.Mesh(g, m); this.bb.frustumCulled = false; this.group.add(this.bb);
  }
  addVisual(id, parts, cap = 300) { // parts: [{geo,mat,cast}]
    const col = new THREE.Color(); const v = this.vis[id] = { parts: [], far: false, cap, tints: [0xffffff], size: new THREE.Vector2(1, 1) };
    for (const p of parts) { if (p.geo.boundingSphere === null) p.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); const im = new THREE.InstancedMesh(p.geo, p.mat, cap); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; im.frustumCulled = false; im.castShadow = p.cast !== false; im.receiveShadow = true; im.setColorAt(0, col.set(0xffffff)); this.group.add(im); v.parts.push({ near: im, mid: null }); }
  }
  setDead(id, dead) { if (dead) this.dead.add(id); else this.dead.delete(id); this.dirty = true; }
  rebuild(cam, map) {
    const q = this.q, px = cam.position.x, pz = cam.position.z, fw = cam.getWorldDirection(this.p).clone(); const fl = Math.hypot(fw.x, fw.z) || 1, fx = fw.x / fl, fz = fw.z / fl;
    for (const v of Object.values(this.vis)) { v.cN = 0; v.cM = 0; }
    let far = 0; const R0 = q.nearR, R1 = q.midR, R2 = q.farR, tmp = new THREE.Color(); const hist = this.m4, qq = this.q4, s = this.s, p = this.p; const up = this.up;
    for (const e of this.world.entities) {
      const dx = e.x - px, dz = e.z - pz, d2 = dx * dx + dz * dz; if (d2 > R2 * R2) continue; const isDead = this.dead.has(e.id); if (isDead && !e.type.startsWith('tree_') && e.type !== 'palm') continue; let vid = map[e.type]; if (!vid) continue; if (isDead) vid = 'stump'; const id = typeof vid === 'function' ? vid(e) : vid, v = this.vis[id]; if (!v) continue;
      const d = Math.sqrt(d2), dot = (dx * fx + dz * fz) / (d || 1); if (d > 34 && dot < (this.q.tier ? .05 : -.15)) continue;
      const scale = e.s * (v.scale || 1);
      if (v.far && d > R1) { if (far < q.farCap && v.bb) { const k = far * 4; this.bbA[k] = e.x; this.bbA[k + 1] = e.y - .1; this.bbA[k + 2] = e.z; this.bbA[k + 3] = v.bb.sz * scale; this.bbB[k] = v.bb.n; this.bbB[k + 1] = (e.id * 7 % 11) / 11; far++; } continue; }
      if (!v.far && d > (v.visR || q.propR)) continue;
      const near = d <= R0 || !v.parts[0].mid; let i = near ? v.cN++ : v.cM++; if (i >= (near ? v.cap : Math.min(v.cap * 3, q.midCap))) continue;
      qq.setFromAxisAngle(up, e.r); s.set(scale, scale, scale); p.set(e.x, e.y + (v.yo || 0) - .04, e.z); hist.compose(p, qq, s); tmp.set(v.tints[e.id % v.tints.length]);
      for (const part of v.parts) { const im = near ? part.near : part.mid; if (!im) continue; im.setMatrixAt(i, hist); if (part.leaf || v.tintAll) im.setColorAt(i, tmp); }
    }
    for (const v of Object.values(this.vis)) for (const part of v.parts) { part.near.count = Math.min(v.cN, v.cap); part.near.instanceMatrix.needsUpdate = true; if (part.near.instanceColor) part.near.instanceColor.needsUpdate = true; if (part.mid) { part.mid.count = Math.min(v.cM, Math.min(v.cap * 3, this.q.midCap)); part.mid.instanceMatrix.needsUpdate = true; if (part.mid.instanceColor) part.mid.instanceColor.needsUpdate = true; } }
    if (this.bb) { this.bb.geometry.instanceCount = far; this.bb.geometry.attributes.iA.needsUpdate = true; this.bb.geometry.attributes.iB.needsUpdate = true; }
  }
  update(cam, map, env) {
    if (this.bbU) { this.bbU.uSunC.value.copy(env.sunColor).multiplyScalar(env.sunI * .4); this.bbU.uAmb.value.copy(env.horizon).lerp(env.zenith, .5).multiplyScalar(env.ambI * .62); this.bbU.fogColor.value.copy(env.fog.color); this.bbU.fogDensity.value = env.fog.density; }
    const yaw = Math.atan2(cam.matrixWorld.elements[8], cam.matrixWorld.elements[10]); let dy = Math.abs(yaw - this.lastYaw); if (dy > Math.PI) dy = 6.283 - dy;
    if (this.dirty || cam.position.distanceToSquared(this.last) > (this.q.tier ? 36 : 64) || dy > (this.q.tier ? .35 : .62)) { this.dirty = false; this.last.copy(cam.position); this.lastYaw = yaw; this.rebuild(cam, map); }
  }
}
// ---- dense ground cover around the camera
function tuftGeometry() {
  const v = [], u = [], n = [], ix = []; let b = 0;
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI + .3, c = Math.cos(a) * .55, s = Math.sin(a) * .55, H = .62, lean = .16; for (let j = 0; j <= 2; j++) { const t = j / 2, y = H * t, off = lean * t * t, w = 1 - t * .22; v.push(-c * w + off * s, y, -s * w - off * c, c * w + off * s, y, s * w - off * c); u.push(0, t * .98 + .01, 1, t * .98 + .01); n.push(0, 1, 0, 0, 1, 0); } for (let j = 0; j < 2; j++) { const a0 = b + j * 2; ix.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); } b += 6; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setIndex(ix); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); return g;
}
function tuftTexture() {
  return canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 110; i++) { const x = Math.random() * w, bw = 3 + Math.random() * 7, ht = h * (.42 + Math.random() * .58), lean = (Math.random() - .5) * 60, hue = 82 + Math.random() * 28, l = 24 + Math.random() * 16; const gr = g.createLinearGradient(0, h, 0, h - ht); gr.addColorStop(0, `hsl(${hue},48%,${l * .55}%)`); gr.addColorStop(.6, `hsl(${hue},50%,${l}%)`); gr.addColorStop(1, `hsl(${hue - 8},52%,${l + 16}%)`); g.fillStyle = gr; g.beginPath(); g.moveTo(x - bw, h); g.quadraticCurveTo(x - bw * .3 + lean * .3, h - ht * .6, x + lean, h - ht); g.quadraticCurveTo(x + bw * .4 + lean * .3, h - ht * .6, x + bw, h); g.fill(); } });
}
export class Decor {
  constructor(scene, world, forest, splat, shared, q) {
    this.world = world; this.f = forest; this.q = q; this.splat = splat; this.limit = 1; this.cells = new Map(); this.last = new THREE.Vector3(1e9, 0, 0); this.group = new THREE.Group(); scene.add(this.group);
    const t = tuftTexture(); const gm = new THREE.MeshStandardMaterial({ map: t, alphaTest: .42, side: THREE.DoubleSide, roughness: .85 }); patchFoliage(gm, shared, { wind: 1.8, sphere: 0, trans: .5, fade: q.grassR });
    this.grass = new THREE.InstancedMesh(tuftGeometry(), gm, q.grassCap); this.grass.frustumCulled = false; this.grass.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.grass.receiveShadow = true; this.grass.setColorAt(0, new THREE.Color()); this.grass.instanceColor.setUsage(THREE.DynamicDrawUsage); this.group.add(this.grass);
    const ids = ['fern_1', 'fern_2', 'plant_1', 'plant_1b', 'plant_2b', 'plant_5', 'plant_6', 'plant_3', 'plant_7b', 'flower_1', 'flower_2', 'flower_3', 'flower_4', 'flower_7', 'clover', 'grass_tall', 'grass_wispy_t', 'grass_wide', 'bush_common', 'bush_flower', 'bush_large', 'bush_large_f', 'bush_long', 'pebble_1', 'pebble_2', 'pebble_3', 'shroom_lae', 'shroom_oy'];
    this.pool = {}; const col = new THREE.Color(1, 1, 1);
    for (const id of ids) { const nat = forest.nature[id]; if (!nat) continue; const v = forest.vis[id]; if (!v) continue; const ims = v.parts.map(p => { const src = p.near; const m = src.material; const im = new THREE.InstancedMesh(src.geometry, m, q.decorCap); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.receiveShadow = true; im.castShadow = false; im.setColorAt(0, col); this.group.add(im); return im; }); this.pool[id] = { ims, n: 0 }; }
    this.m = new THREE.Matrix4(); this.qq = new THREE.Quaternion(); this.vv = new THREE.Vector3(); this.ss = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0); this.c = new THREE.Color();
  }
  gen(ci, cj) {
    const CS = 20, q = this.q, w = this.world, sp = this.splat, out = { grass: [], items: [], gm: null, gc: null }; let s = (ci * 73856093 ^ cj * 19349663) >>> 0 || 1; const R = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const lk = (x, z) => { const i = Math.max(0, Math.min(sp.w - 1, ((x + w.WORLD / 2) / w.WORLD * sp.w) | 0)), j = Math.max(0, Math.min(sp.h - 1, ((z + w.WORLD / 2) / w.WORLD * sp.h) | 0)), k = (j * sp.w + i) * 4; return [sp.d[k] / 255, sp.d[k + 1] / 255, sp.d[k + 2] / 255]; };
    for (let n = 0; n < q.grassPerCell; n++) {
      const x = (ci + R()) * CS, z = (cj + R()) * CS, y = w.height(x, z); if (y < .9) continue; if ((w.pois.caves || []).some(c => Math.hypot(x - c.x, z - c.z) < c.r + .5)) continue; const [sa, fo, ro] = lk(x, z), r = R(), rr = R(), ss = .7 + R() * .75; const gr = 1 - sa - fo - ro;
      if (w.waterLevel(x, z) !== null) continue;
      if (r < gr * 1.0 + fo * .4 && ro < .3 && sa < .25) { out.grass.push(x, y, z, ss * (fo > .4 ? .8 : 1), rr * 6.28, fo); }
      if (n % 4) continue; const r2 = R();
      let id = null; if (fo > .4) { id = r2 < .3 ? (R() < .5 ? 'fern_1' : 'fern_2') : r2 < .42 ? 'plant_1b' : r2 < .52 ? 'plant_2b' : r2 < .58 ? 'plant_5' : r2 < .64 ? 'plant_7b' : r2 < .69 ? 'bush_common' : r2 < .72 ? 'bush_large' : r2 < .74 ? 'clover' : r2 < .75 ? 'shroom_oy' : null; }
      else if (gr > .45) { id = r2 < .07 ? 'flower_1' : r2 < .14 ? 'flower_3' : r2 < .19 ? 'flower_4' : r2 < .25 ? 'flower_7' : r2 < .3 ? 'flower_2' : r2 < .41 ? 'grass_wispy_t' : r2 < .52 ? 'grass_tall' : r2 < .58 ? 'bush_flower' : r2 < .61 ? 'bush_long' : r2 < .63 ? 'bush_large_f' : r2 < .66 ? 'grass_wide' : r2 < .7 ? 'plant_3' : null; }
      else if (sa > .5) { id = y > 3 && r2 < .13 ? 'grass_wispy_t' : r2 < .2 ? 'pebble_1' : r2 < .25 ? 'pebble_3' : null; } else if (ro > .4) { id = r2 < .25 ? 'pebble_2' : r2 < .4 ? 'pebble_3' : r2 < .45 ? 'plant_6' : null; }
      if (id) out.items.push(id, x, y, z, .75 + R() * .65, R() * 6.28);
    }
    const n = out.grass.length / 6, gm = out.gm = new Float32Array(n * 16), gc = out.gc = new Float32Array(n * 3), M = this.m, Q = this.qq, V = this.vv, Z = this.ss, C = this.c; for (let i = 0; i < n; i++) { const a = i * 6, g = out.grass; Q.setFromAxisAngle(this.up, g[a + 4]); V.set(g[a], g[a + 1], g[a + 2]); const s = g[a + 3]; Z.set(s, s * (.8 + (a % 7) * .08), s); M.compose(V, Q, Z); gm.set(M.elements, i * 16); const fo = g[a + 5]; C.setRGB(.95 + (a % 5) * .03 - fo * .25, 1.02 - fo * .2, .78 - fo * .15); gc[i * 3] = C.r; gc[i * 3 + 1] = C.g; gc[i * 3 + 2] = C.b; }
    return out;
  }
  update(cam) {
    if (cam.position.distanceToSquared(this.last) < (this.q.tier ? 25 : 49)) return; this.last.copy(cam.position);
    const CS = 20, r = Math.ceil(this.q.grassR / CS), ci = Math.floor(cam.position.x / CS), cj = Math.floor(cam.position.z / CS); let g = 0; for (const p of Object.values(this.pool)) p.n = 0; const gm = this.grass, m = this.m, qq = this.qq, vv = this.vv, ss = this.ss, up = this.up, c = this.c; const keep = new Set();
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const k = (ci + a) * 100000 + (cj + b); keep.add(k); let cell = this.cells.get(k); if (!cell) { cell = this.gen(ci + a, cj + b); this.cells.set(k, cell); }
      const cap = this.q.grassCap * this.limit, cn = Math.min(cell.gm.length / 16, Math.max(0, cap - g) | 0); if (cn > 0) { gm.instanceMatrix.array.set(cell.gm.subarray(0, cn * 16), g * 16); gm.instanceColor.array.set(cell.gc.subarray(0, cn * 3), g * 3); g += cn; }
      if (Math.hypot(a, b) * CS > this.q.decorR) continue; const it = cell.items; for (let i = 0; i < it.length; i += 6) { const p = this.pool[it[i]]; if (!p || p.n >= this.q.decorCap) continue; qq.setFromAxisAngle(up, it[i + 5]); vv.set(it[i + 1], it[i + 2] - .03, it[i + 3]); ss.setScalar(it[i + 4]); m.compose(vv, qq, ss); const v = this.f.vis[it[i]], tints = v.tints; for (let q2 = 0; q2 < p.ims.length; q2++) { const im = p.ims[q2]; im.setMatrixAt(p.n, m); if (v.parts[q2].leaf) { c.set(tints[p.n % tints.length]); im.setColorAt(p.n, c); } } p.n++; }
    }
    if (this.cells.size > 900) for (const k of this.cells.keys()) if (!keep.has(k)) this.cells.delete(k);
    gm.count = g; gm.instanceMatrix.needsUpdate = true; gm.instanceColor.needsUpdate = true; for (const p of Object.values(this.pool)) for (const im of p.ims) { im.count = p.n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
}
