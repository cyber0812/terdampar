import * as THREE from 'three';
const c = h => new THREE.Color(h);
const KEYS = [ // sun elevation, zenith, horizon, sunColor, sunI, hemiI, fogDensityScale
  { e: -1.0, z: c(0x030613), h: c(0x0a1226), s: c(0x8fb0f0), i: .55, a: .34 },
  { e: -.16, z: c(0x060b22), h: c(0x13203f), s: c(0x8fb0f0), i: .5, a: .36 },
  { e: -.04, z: c(0x1c2a57), h: c(0xe0683c), s: c(0xff7a3a), i: .55, a: .5 },
  { e: .07, z: c(0x2d4f8e), h: c(0xffa469), s: c(0xffa055), i: 2.1, a: .75 },
  { e: .24, z: c(0x2a78d0), h: c(0xeee6c0), s: c(0xffe6bc), i: 3.1, a: .95 },
  { e: .55, z: c(0x1a62c8), h: c(0x9fd2f2), s: c(0xfff3e0), i: 3.5, a: 1.05 },
  { e: 1.0, z: c(0x155cc4), h: c(0x96cdf0), s: c(0xfff6ea), i: 3.7, a: 1.1 } ];
export function skyParams(t, rain) {
  const ang = (t - .25) * Math.PI * 2, e = Math.sin(ang);
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) if (e >= KEYS[i].e && e <= KEYS[i + 1].e) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const k = (e - a.e) / Math.max(1e-4, b.e - a.e);
  const p = { e, zenith: a.z.clone().lerp(b.z, k), horizon: a.h.clone().lerp(b.h, k), sunColor: a.s.clone().lerp(b.s, k), sunI: a.i + (b.i - a.i) * k, ambI: a.a + (b.a - a.a) * k };
  if (rain > 0) { const g = c(0x737f8c).multiplyScalar(Math.max(.14, Math.min(1, e + .35))); p.zenith.lerp(g.clone().multiplyScalar(.8), rain * .85); p.horizon.lerp(g, rain * .85); p.sunI *= 1 - rain * .78; p.ambI *= 1 - rain * .2; }
  const dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), .34).normalize();
  p.isNight = e < -.05; p.sunDir = dir; p.lightDir = p.isNight ? new THREE.Vector3(-dir.x, -dir.y, .34).normalize() : dir.clone();
  return p;
}
export class Sky {
  constructor(tex, shared, q = { tier: 2 }) {
    this.u = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color() }, uMoon: { value: new THREE.Vector3(0, -1, 0) }, uTime: shared.uTime, uNight: { value: 0 }, uRain: { value: 0 }, tN: { value: tex.waterN }, uCover: { value: .5 } };
    const m = new THREE.ShaderMaterial({ defines: { LOW: q.tier ? 0 : 1 }, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, uniforms: this.u,
      vertexShader: `varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); gl_Position=p.xyww; }`,
      fragmentShader: /*glsl*/`
 varying vec3 vD; uniform vec3 uZen,uHor,uSun,uSunC,uMoon; uniform float uTime,uNight,uRain,uCover; uniform sampler2D tN;
 float hash(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 #if LOW==1
 float fbm(vec2 p){float a=.58,s=0.;for(int i=0;i<3;i++){s+=a*texture2D(tN,p).b;p=p*2.03+vec2(.13,.71);a*=.5;}return s+.06;}
 #else
 float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*texture2D(tN,p).b;p=p*2.03+vec2(.13,.71);a*=.5;}return s;}
 #endif
 void main(){ vec3 d=normalize(vD); float h=max(d.y,0.);
  vec3 col=mix(uHor,uZen,pow(h,.52)); 
  float sd=max(dot(d,uSun),0.);
  col+=uSunC*(pow(sd,8.)*.16+pow(sd,64.)*.28)*(1.-uNight)*(1.-uRain*.8);
  if(d.y<0.){col=mix(col,uHor*.72,clamp(-d.y*4.,0.,1.));}
  if(uNight>0.01){ vec3 q=floor(d*170.); vec3 qf=fract(d*170.)-.5; float st=hash(q); float tw=.7+.3*sin(uTime*2.+st*90.); col+=vec3(.9,.95,1.)*step(.9975,st)*smoothstep(.42,.08,length(qf))*(.5+fract(st*91.)*.9)*tw*uNight*smoothstep(.0,.25,d.y)*(1.-uRain);
    #if LOW==0
    vec2 mw=d.xz/(abs(d.y)+.3); col+=vec3(.05,.07,.13)*smoothstep(.45,.75,fbm(mw*.08+.3))*uNight*.8;
    #endif
    
    float md=dot(d,uMoon); col+=vec3(.92,.95,1.)*smoothstep(.99955,.99975,md)*uNight*2.2; col+=vec3(.2,.27,.42)*pow(max(md,0.),160.)*uNight;}
  float sunD=smoothstep(.99945,.9997,sd); col+=uSunC*sunD*7.*(1.-uRain)*(1.-uNight);
  if(d.y>.005){ vec2 uv=d.xz/(d.y+.16)*.045; float t=uTime*.0016;
    float n=fbm(uv+vec2(t,t*.4));
    #if LOW==1
     float n2=texture2D(tN,uv*.42-vec2(t*.5,0.)+.37).b*1.02;
    #else
     float n2=fbm(uv*.42-vec2(t*.5,0.)+.37);
    #endif
    
    float cov=mix(.56,.38,uCover+uRain*.6); float den=smoothstep(cov,cov+.13,n*.62+n2*.4);
    #if LOW==1
     float lit=clamp(1.15-n*.55,0.,1.);
    #else
     float sh=fbm(uv+vec2(t,t*.4)+uSun.xz*.022); float lit=clamp((n-sh)*4.+.62,0.,1.);
    #endif
    
    vec3 cTop=mix(vec3(1.),uSunC*1.08,.34)*(uNight>.5?.12:1.), cBot=mix(uHor,uZen,.35)*.74;
    vec3 cc=mix(cBot,cTop,lit); cc+=uSunC*pow(sd,10.)*.5*(1.-uNight);
    cc=mix(cc,vec3(.33,.36,.41)*dot(uHor,vec3(.5)),uRain*.85);
    col=mix(col,cc,den*smoothstep(.0,.14,d.y)*.94); }
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m); this.mesh.frustumCulled = false; this.mesh.renderOrder = -10;
  }
  apply(p, rain, cover) { const u = this.u; u.uZen.value.copy(p.zenith); u.uHor.value.copy(p.horizon); u.uSun.value.copy(p.sunDir); u.uMoon.value.set(-p.sunDir.x, -p.sunDir.y, p.sunDir.z + .3).normalize(); u.uSunC.value.copy(p.sunColor); u.uNight.value = THREE.MathUtils.smoothstep(-p.e, .0, .2); u.uRain.value = rain; u.uCover.value = cover; }
}
