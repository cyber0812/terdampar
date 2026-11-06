import * as THREE from 'three';
const CHUNK = 96;
function gridGeo(n) {
  const v = [], idx = []; const s = CHUNK / n, row = n + 1;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) v.push(i * s, 0, j * s);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * row + i; idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1); }
  // skirt
  let base = v.length / 3; const ring = [];
  for (let i = 0; i <= n; i++) ring.push(i); for (let j = 1; j <= n; j++) ring.push(j * row + n);
  for (let i = n - 1; i >= 0; i--) ring.push(n * row + i); for (let j = n - 1; j > 0; j--) ring.push(j * row);
  ring.forEach(r => v.push(v[r * 3], -1, v[r * 3 + 2]));
  for (let k = 0; k < ring.length; k++) { const a = ring[k], b = ring[(k + 1) % ring.length], c = base + k, d = base + (k + 1) % ring.length; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(v.length).map((_, i) => i % 3 == 1 ? 1 : 0), 3));
  g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(48, 0, 48), 5000); return g;
}
const VS_COMMON = /*glsl*/`
 uniform highp sampler2D tHeight; uniform vec2 uWorld; varying vec3 vWP;
 float HH(vec2 p){ vec2 g=(p+uWorld.x*.5)/uWorld.x*(uWorld.y-1.); ivec2 i=ivec2(floor(g)); vec2 f=g-vec2(i);
  i=clamp(i,ivec2(0),ivec2(int(uWorld.y)-2));
  float a=texelFetch(tHeight,i,0).r,b=texelFetch(tHeight,i+ivec2(1,0),0).r,c=texelFetch(tHeight,i+ivec2(0,1),0).r,d=texelFetch(tHeight,i+ivec2(1,1),0).r;
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}`;
const FS_COMMON = /*glsl*/`
 uniform sampler2D tNormal,tSplat,tSand,tGrass,tForest,tRock,tSandN,tGrassN,tForestN,tRockN,tCaustic; uniform vec2 uWorld; uniform float uTime,uWet; uniform vec3 uSunDirW; varying vec3 vWP;
 vec3 unp(vec3 c){return c*2.-1.;}
 float cloudShadow(vec2 p){float n=texture2D(tCaustic,p*.0011+vec2(uTime*.0012,uTime*.0007)).b; return smoothstep(.40,.72,n);}`;
export class Terrain {
  constructor(world, tex, shared, q) {
    this.q = q; this.chunks = []; const N = world.N;
    const hTex = new THREE.DataTexture(world.h, N, N, THREE.RedFormat, THREE.FloatType); hTex.internalFormat = 'R32F'; hTex.minFilter = hTex.magFilter = THREE.NearestFilter; hTex.needsUpdate = true;
    this.hTex = hTex;
    const u = this.uniforms = { tHeight: { value: hTex }, uWorld: { value: new THREE.Vector2(world.WORLD, N) }, tNormal: { value: tex.normal }, tSplat: { value: tex.splat },
      tSand: { value: tex.sand }, tGrass: { value: tex.grass }, tForest: { value: tex.forest }, tRock: { value: tex.rock }, tSandN: { value: tex.sandN }, tGrassN: { value: tex.grassN }, tForestN: { value: tex.forestN }, tRockN: { value: tex.rockN },
      tCaustic: { value: tex.waterN }, uTime: shared.uTime, uWet: shared.uWet, uSunDirW: shared.uSunDir };
    const m = this.material = q.tier ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 }) : new THREE.MeshLambertMaterial({ color: 0xffffff });
    m.defines = { TRIPLANAR: q.tier >= 2 ? 1 : 0, LOW: q.tier ? 0 : 1 };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VS_COMMON)
        .replace('#include <begin_vertex>', `vec3 transformed=vec3(position.x,0.,position.z); vec4 wp0=modelMatrix*vec4(transformed,1.); transformed.y=HH(wp0.xz)+position.y*7.; vWP=vec3(wp0.x,transformed.y,wp0.z);`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FS_COMMON)
        .replace('#include <map_fragment>', /*glsl*/`
 vec2 suv=(vWP.xz+uWorld.x*.5)/uWorld.x; vec3 sp=texture2D(tSplat,suv).rgb;
 vec3 wn=normalize(unp(texture2D(tNormal,suv).xyz)); vec2 p=vWP.xz; float dist=length(vViewPosition);
 float macro=texture2D(tGrass,p*.0173).g;
 #if LOW==1
  float macro2=fract(macro*3.7), n3=macro;
 #else
  float macro2=texture2D(tForest,p*.0071).r, n3=texture2D(tSand,p*.043).r;
 #endif
 float sandW=sp.r, forestW=sp.g, rockW=sp.b;
 // sharpen layer transitions with texture detail
 float grassW=max(0.,1.-sandW-forestW-rockW);
 vec4 w=vec4(sandW,grassW,forestW,rockW); w*=1.+vec4(n3,macro,macro2,0.)*1.6; w=pow(w,vec4(2.2)); w/=max(1e-4,w.x+w.y+w.z+w.w);
 vec2 uvS=p*.21,uvG=p*.17,uvF=p*.19,uvR=p*.11;
 vec3 sand=texture2D(tSand,uvS).rgb;
 #if LOW==0
 sand=mix(sand,texture2D(tSand,uvS*.27).rgb,.45);
 #endif
 float sl=dot(sand,vec3(.33)); sand=mix(vec3(sl),sand,.5)*vec3(2.25,1.98,1.42)+vec3(.16,.13,.07);
 #if LOW==1
 sand=mix(vec3(.74,.64,.46),sand,.38);
 #endif
 #if LOW==1
 vec3 grass=texture2D(tGrass,uvG).rgb*vec3(.74,1.12,.5);
 #else
 vec3 grass=mix(texture2D(tGrass,uvG).rgb,texture2D(tGrass,uvG*.31).rgb,.45)*vec3(.74,1.12,.5);
 #endif
 grass=mix(grass,grass*vec3(1.3,1.02,.75),smoothstep(.3,.8,macro2));
 #if LOW==1
 vec3 forest=texture2D(tForest,uvF).rgb*vec3(.98,1.08,.66);
 #else
 vec3 forest=mix(texture2D(tForest,uvF).rgb,texture2D(tForest,uvF*.29).rgb,.4)*vec3(.98,1.08,.66);
 #endif
 vec3 rock;
 #if TRIPLANAR==1
  vec3 tw=pow(abs(wn),vec3(5.)); tw/=tw.x+tw.y+tw.z;
  rock=texture2D(tRock,vWP.zy*.09).rgb*tw.x+texture2D(tRock,p*.09).rgb*tw.y+texture2D(tRock,vWP.xy*.09).rgb*tw.z;
 #else
  rock=texture2D(tRock,uvR).rgb;
 #endif
 rock=mix(rock,rock*vec3(.98,.9,.78),smoothstep(.2,.7,macro))*1.18;
 vec3 col=sand*w.x+grass*w.y+forest*w.z+rock*w.w;
 col*=.78+.44*macro2;
 float y=vWP.y, tide=.34+.26*sin(uTime*.33+p.x*.02+p.y*.017);
 float wet=smoothstep(tide+.95,tide+.05,y)*step(-.02,y-(-999.));
 wet=max(wet,uWet*.75*w.x);
 col*=mix(1.,.56,wet);
 float groundRough=mix(.9,.3,wet);
 // underwater: tint and animated caustics
 if(y<0.){ float d=clamp(-y/9.,0.,1.); vec2 cu=p*.075; float c1=texture2D(tCaustic,cu+uTime*.022).b,c2=texture2D(tCaustic,cu*1.27-uTime*.018).b; float ca=pow(min(c1,c2)*1.9,3.2);
   col=mix(col,col*vec3(.45,.82,.86),d*.8)+vec3(.55,.8,.75)*ca*(1.-d)*1.1;}
 diffuseColor.rgb=col;`)
        .replace('#include <roughnessmap_fragment>', `float roughnessFactor=groundRough*(w.w>.5?.86:1.);`)
        .replace('#include <normal_fragment_maps>', q.tier === 0 ? `normal=normalize((viewMatrix*vec4(wn,0.)).xyz);` : /*glsl*/`
 vec3 dn=unp(texture2D(tSandN,uvS).xyz)*w.x+unp(texture2D(tGrassN,uvG).xyz)*w.y+unp(texture2D(tForestN,uvF).xyz)*w.z+unp(texture2D(tRockN,uvR).xyz)*w.w;
 float nfade=clamp(1.-dist/220.,.18,1.);
 vec3 wN=normalize(vec3(wn.x+dn.x*.75*nfade,wn.y,wn.z+dn.y*.75*nfade));
 normal=normalize((viewMatrix*vec4(wN,0.)).xyz);`)
        .replace('#include <lights_fragment_end>', q.tier === 0 ? '#include <lights_fragment_end>' : `#include <lights_fragment_end>
 float cs=cloudShadow(p); reflectedLight.directDiffuse*=mix(1.,.62,cs); reflectedLight.directSpecular*=mix(1.,.5,cs);`);
      this.shader = sh;
    };
    m.customProgramCacheKey = () => 'terrain' + q.tier;
    const res = q.terrainRes; this.lods = [gridGeo(res), gridGeo(res / 2), gridGeo(res / 4), gridGeo(Math.max(8, res / 8))];
    this.group = new THREE.Group(); const half = world.WORLD / 2;
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const x = -half + i * CHUNK, z = -half + j * CHUNK; let lo = 1e9, hi = -1e9;
      for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) { const h = world.height(x + a * 12, z + b * 12); lo = Math.min(lo, h); hi = Math.max(hi, h); }
      if (hi < -32) continue;
      const mesh = new THREE.Mesh(this.lods[3], m); mesh.position.set(x, 0, z); mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      this.group.add(mesh); this.chunks.push({ mesh, box: new THREE.Box3(new THREE.Vector3(x, lo - 8, z), new THREE.Vector3(x + CHUNK, hi + 4, z + CHUNK)), cx: x + 48, cz: z + 48 });
    }
    this.frustum = new THREE.Frustum(); this.pv = new THREE.Matrix4();
  }
  update(camera) {
    this.pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.pv);
    const px = camera.position.x, pz = camera.position.z, l = this.q.lodDist;
    for (const c of this.chunks) {
      const vis = this.frustum.intersectsBox(c.box); c.mesh.visible = vis; if (!vis) continue;
      const d = Math.hypot(c.cx - px, c.cz - pz); c.mesh.geometry = this.lods[d < l[0] ? 0 : d < l[1] ? 1 : d < l[2] ? 2 : 3];
    }
  }
}
