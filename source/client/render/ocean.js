import * as THREE from 'three';
const WAVES = [[.86, .5, .42, 74], [-.6, .8, .27, 43], [.3, -.95, .16, 23], [.97, .24, .09, 12], [-.8, -.6, .05, 7]];
const waterFrag = /*glsl*/`
 uniform sampler2D tN,tDepth; uniform vec2 uWorld; uniform float uTime,uMode; uniform vec3 uSunDir,uSunCol,uHor,uZen,uDeep,uShal; uniform float uNight;
 varying vec3 vW; varying vec3 vN; varying float vCrest; varying vec2 vFlow;
 #include <fog_pars_fragment>
 vec3 sky(vec3 r){float h=max(r.y,0.);return mix(uHor*.72,uZen,pow(h,.42));}
 void main(){
  vec3 V=normalize(cameraPosition-vW); float dist=length(cameraPosition-vW);
  vec2 p=vW.xz; vec2 fl=vFlow;
  vec2 u1=p*.042+fl+vec2(uTime*.012,uTime*.008), u2=p*.097+fl*1.6-vec2(uTime*.018,-uTime*.011), u3=p*.019+vec2(-uTime*.004,uTime*.006);
  vec3 n1=texture2D(tN,u1).xyz*2.-1., n2=texture2D(tN,u2).xyz*2.-1.;
  #if LOW==1
   vec3 n3=n1;
  #else
   vec3 n3=texture2D(tN,u3).xyz*2.-1.;
  #endif
  float amp=mix(.34,.1,clamp(dist/700.,0.,1.));
  vec3 N=normalize(vN+vec3(n1.x+n2.x*.6+n3.x*.8,0.,n1.y+n2.y*.6+n3.y*.8)*amp);
  vec2 suv=(p+uWorld.x*.5)/uWorld.x; float depth=texture2D(tDepth,suv).r*12.;
  if(uMode>.5) depth=texture2D(tDepth,suv).g*7.;
  float F=.02+.98*pow(1.-max(dot(N,V),0.),5.); F=min(F,.55);
  vec3 R=reflect(-V,N); R.y=abs(R.y); vec3 refl=sky(R);
  float sp=pow(max(dot(R,uSunDir),0.),uNight>.5?260.:520.)*(uNight>.5?.4:7.)+pow(max(dot(R,uSunDir),0.),36.)*.08;
  float dt=1.-exp(-depth*.42), dt2=1.-exp(-depth*.26);
  vec3 body=mix(uShal,uDeep,dt2); float sss=pow(max(dot(V,-uSunDir+vec3(0.,.3,0.)),0.),3.)*.35; body+=uShal*sss*(.4+vCrest);
  float lum=clamp(dot(uHor,vec3(.33))*.95+.12,.05,.95); body*=lum;
  #if LOW==1
   float fn=n2.z*.5+.55;
  #else
   float fn=texture2D(tN,p*.14+vec2(uTime*.01,0.)).b*.6+texture2D(tN,p*.31-vec2(0.,uTime*.016)).b*.5;
  #endif
  float foam=0.;
  if(uMode<.5){ float sh=smoothstep(1.5,.05,depth+fn*.7); float wave=sin(depth*2.4-uTime*.75+fn*4.)*.5+.5; foam=sh*smoothstep(.34,.74,wave*fn*1.9)+smoothstep(.2,.0,depth)*.9; foam+=smoothstep(.86,1.2,vCrest+fn*.5)*.3*(1.-clamp(dist/500.,0.,1.)); }
  else { foam=smoothstep(.22,.0,depth)*fn*.6; }
  foam=clamp(foam,0.,1.);
  vec3 col=mix(body,refl,F)+uSunCol*sp;
  col=mix(col,vec3(.95,.98,.97)*(lum*1.05),foam*.92);
  float a=clamp(dt*1.5+F*.6+foam,0.,1.); a=max(a,.0);
  gl_FragColor=vec4(col,a);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
export class Ocean {
  constructor(world, terrainU, tex, shared, q) {
    // radial grid centred on camera
    const rings = q.tier >= 2 ? 110 : q.tier ? 60 : 44, seg = q.tier >= 2 ? 160 : q.tier ? 72 : 52, v = [], idx = [];
    for (let i = 0; i <= rings; i++) { const r = i == 0 ? 0 : 1.4 * Math.pow(1.058, i * (110 / rings)) * (i * (110 / rings) * .9); for (let s = 0; s <= seg; s++) { const a = s / seg * Math.PI * 2; v.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
    for (let i = 0; i < rings; i++) for (let s = 0; s < seg; s++) { const a = i * (seg + 1) + s, b = a + seg + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    // depth texture (R: sea depth, G: inland water depth)
    const N = 1024, d = new Uint8Array(N * N * 4), { lake, river } = world.pois;
    const inland = world.waterLevel.bind(world);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = (i + .5) / N * world.WORLD - world.WORLD / 2, z = (j + .5) / N * world.WORLD - world.WORLD / 2, h = world.height(x, z), q4 = (j * N + i) * 4; d[q4] = Math.min(255, Math.max(0, -h) / 12 * 255); let w = 0; if (h > -1 && Math.hypot(x - lake.x, z - lake.z) < 260 || (x > 180 && z > -40)) { const lv = inland(x, z); if (lv != null && lv > .05) w = Math.min(255, Math.max(0, lv - h) / 7 * 255); } d[q4 + 1] = w; d[q4 + 3] = 255; }
    const dt = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); dt.minFilter = THREE.LinearMipmapLinearFilter; dt.magFilter = THREE.LinearFilter; dt.generateMipmaps = true; dt.needsUpdate = true;
    const u = this.u = { tN: { value: tex.waterN }, tDepth: { value: dt }, uWorld: terrainU.uWorld, uTime: shared.uTime, uSunDir: shared.uSunDir, uSunCol: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uZen: { value: new THREE.Color() }, uDeep: { value: new THREE.Color(0x06385f) }, uShal: { value: new THREE.Color(0x21c4bd) }, uNight: { value: 0 }, uMode: { value: 0 }, fogColor: { value: new THREE.Color() }, fogDensity: { value: .0007 } };
    const gl = WAVES.map(w => `vec4(${w[0].toFixed(3)},${w[1].toFixed(3)},${w[2].toFixed(3)},${w[3].toFixed(1)})`).join(',');
    const vs = /*glsl*/`
 uniform float uTime; uniform vec2 uWorld; uniform sampler2D tDepth; varying vec3 vW,vN; varying float vCrest; varying vec2 vFlow; attribute vec2 flow;
 #include <fog_pars_vertex>
 const vec4 W[${WAVES.length}]=vec4[${WAVES.length}](${gl});
 void main(){ vec3 base=(modelMatrix*vec4(position,1.)).xyz; vec3 p=base; vec3 n=vec3(0.,1.,0.); float cr=0.; vFlow=vec2(0.);
  float shore=1.; vec2 suv=(base.xz+uWorld.x*.5)/uWorld.x; float dp=textureLod(tDepth,suv,1.).r*12.; shore=clamp(.2+dp*.34,.0,1.);
  for(int i=0;i<${WAVES.length};i++){ vec2 D=W[i].xy; float A=W[i].z*shore, L=W[i].w, k=6.2832/L, c=sqrt(9.8/k), f=k*(dot(D,base.xz)-c*uTime*.72), Q=.55;
   p.x+=Q*A*D.x*cos(f); p.z+=Q*A*D.y*cos(f); p.y+=A*sin(f); n.x-=D.x*k*A*cos(f); n.z-=D.y*k*A*cos(f); n.y-=Q*k*A*sin(f); cr+=(sin(f)*.5+.5)*A; }
  vCrest=cr/.55; vN=normalize(n); vW=p; vec4 mvPosition=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
 }`;
    const LOWD = { LOW: q.tier ? 0 : 1 }; const m = new THREE.ShaderMaterial({ defines: LOWD, uniforms: u, vertexShader: vs, fragmentShader: waterFrag, transparent: true, depthWrite: false, fog: true });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    // inland water: lake disk + river ribbon
    const u2 = { ...u, uMode: { value: 1 }, uShal: { value: new THREE.Color(0x4fb5a0) }, uDeep: { value: new THREE.Color(0x0f4a55) } };
    const vs2 = `varying vec3 vW,vN; varying float vCrest; varying vec2 vFlow; attribute float flow; uniform float uTime;
 #include <fog_pars_vertex>
 void main(){ vW=(modelMatrix*vec4(position,1.)).xyz; vN=vec3(0.,1.,0.); vCrest=0.; vFlow=vec2(0.,-flow*.06-uTime*.09*step(.01,flow)); vec4 mvPosition=viewMatrix*vec4(vW,1.); gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`;
    const m2 = new THREE.ShaderMaterial({ defines: LOWD, uniforms: u2, vertexShader: vs2, fragmentShader: waterFrag, transparent: true, depthWrite: false, fog: true }); this.u2 = u2;
    const lg = new THREE.CircleGeometry(lake.r + 60, 72, 0, Math.PI * 2); lg.rotateX(-Math.PI / 2); lg.setAttribute('flow', new THREE.Float32BufferAttribute(new Float32Array(lg.attributes.position.count), 1));
    this.lake = new THREE.Mesh(lg, m2); this.lake.position.set(lake.x, lake.level, lake.z); this.lake.renderOrder = 6;
    const rv = [], rf = [], ri = []; let L = 0; river.forEach((r, i) => { const a = river[Math.max(0, i - 1)], b = river[Math.min(river.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; if (i) L += Math.hypot(r[0] - river[i - 1][0], r[1] - river[i - 1][1]); const w = r[3] + 3; for (let s = -2; s <= 2; s++) { const f = s / 2; rv.push(r[0] - tz * w * f, r[2], r[1] + tx * w * f); rf.push(L + .01); } });
    for (let i = 0; i < river.length - 1; i++) for (let s = 0; s < 4; s++) { const a = i * 5 + s, b = a + 5; ri.push(a, b, a + 1, a + 1, b, b + 1); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rg.setAttribute('flow', new THREE.Float32BufferAttribute(rf, 1)); rg.setIndex(ri);
    this.river = new THREE.Mesh(rg, m2); this.river.renderOrder = 6; this.river.frustumCulled = false;
    this.group = new THREE.Group(); this.group.add(this.mesh, this.lake, this.river);
  }
  update(camera, p, fog) {
    this.mesh.position.set(Math.round(camera.position.x / 4) * 4, 0, Math.round(camera.position.z / 4) * 4);
    const u = this.u; u.uSunCol.value.copy(p.sunColor).multiplyScalar(Math.min(1.4, p.sunI * .5)); u.uHor.value.copy(p.horizon); u.uZen.value.copy(p.zenith); u.uNight.value = p.isNight ? 1 : 0; u.fogColor.value.copy(fog.color); u.fogDensity.value = fog.density;
    this.u2.uNight = u.uNight;
  }
}
