// Bakes the island: heightmap (with hydraulic erosion), splat, normals, spawn lists, POIs.
import fs from 'fs'; import path from 'path'; import {createRequire} from 'module';
const require=createRequire(import.meta.url); const sharp=require('/opt/npm-tools/node_modules/sharp');
const OUT=path.resolve(import.meta.dirname,'../public/world'); fs.mkdirSync(OUT,{recursive:true});
const N=1025, WORLD=1536, S=WORLD/(N-1), SEA=0;
const idx=(i,j)=>j*N+i, w2g=v=>(v+WORLD/2)/S, g2w=v=>v*S-WORLD/2;
// ---- rng/noise
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd=mulberry(90210);
const P=new Uint8Array(512);{const p=[...Array(256).keys()];for(let i=255;i>0;i--){const j=Math.floor(rnd()*(i+1));[p[i],p[j]]=[p[j],p[i]]}for(let i=0;i<512;i++)P[i]=p[i&255]}
const G=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
function sn(x,y){const F=.366025403,Gg=.211324865;const s=(x+y)*F,i=Math.floor(x+s),j=Math.floor(y+s),t=(i+j)*Gg;const x0=x-i+t,y0=y-j+t;const i1=x0>y0?1:0,j1=1-i1;const x1=x0-i1+Gg,y1=y0-j1+Gg,x2=x0-1+2*Gg,y2=y0-1+2*Gg;const ii=i&255,jj=j&255;let n=0;
 for(const [xx,yy,gi] of [[x0,y0,P[ii+P[jj]]],[x1,y1,P[ii+i1+P[jj+j1]]],[x2,y2,P[ii+1+P[jj+1]]]]){let t=.5-xx*xx-yy*yy;if(t>0){t*=t;const g=G[gi&7];n+=t*t*(g[0]*xx+g[1]*yy)}}return 70*n}
const fbm=(x,y,o=5,l=2,g=.5)=>{let a=1,f=1,s=0,m=0;for(let i=0;i<o;i++){s+=a*sn(x*f,y*f);m+=a;a*=g;f*=l}return s/m};
const ridged=(x,y,o=6)=>{let a=1,f=1,s=0,m=0,w=1;for(let i=0;i<o;i++){let n=1-Math.abs(sn(x*f,y*f));n*=n;n*=w;w=Math.min(1,Math.max(0,n*1.6));s+=a*n;m+=a;a*=.52;f*=2.03}return s/m};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)}, mix=(a,b,t)=>a+(b-a)*t;
const gauss=(x,z,cx,cz,r)=>Math.exp(-((x-cx)**2+(z-cz)**2)/(r*r));
// ---- base terrain
console.time('base');
const H=new Float32Array(N*N);
for(let j=0;j<N;j++)for(let i=0;i<N;i++){
 const x=g2w(i),z=g2w(j);
 const wx=x+105*fbm(x*.0017+7.1,z*.0017+3.3,4), wz=z+105*fbm(x*.0017-4.2,z*.0017+9.8,4);
 const th=Math.atan2(wz,wx), rr=Math.hypot(wx*1.0,wz*.92);
 let coast=545+70*Math.sin(2*th+1.1)+52*Math.sin(3*th-.5)+30*Math.sin(5*th+2.2)+55*fbm(x*.0042,z*.0042,4);
 // long straight east coast for the runway beach
 const east=sstep(.95,.35,Math.abs(th));
 coast=mix(coast,(600)/Math.max(.45,Math.cos(th)),east*.92);
 const d=coast-rr;
 const land=1-Math.exp(-Math.max(d,0)/120);
 let h;
 if(d>0){
  h=1.2+land*11+ (fbm(x*.0052+2,z*.0052,5)*.5+.5)*land*land*20;
  const m1=gauss(x,z,-235,-205,250), m2=gauss(x,z,-60,-330,150), m3=gauss(x,z,120,300,175), m4=gauss(x,z,-330,170,160);
  const r1=ridged(x*.0031+5,z*.0031+1,6), r2=ridged(x*.0052-3,z*.0052+7,5);
  h+=m1*(165*Math.pow(r1,1.15)+42)*land;
  h+=m2*(62*r2+12)*land+m3*(58*r2+10)*land+m4*(46*r1+10)*land;
  h+=fbm(x*.021,z*.021,4)*2.2*land;
 } else {
  h=-Math.min(38,Math.pow(-d,1.08)*.085)+fbm(x*.012,z*.012,3)*1.2*sstep(0,40,-d);
 }
 H[idx(i,j)]=h;
}
console.timeEnd('base');
// ---- hydraulic erosion (droplets)
console.time('erosion');
const BR=3,brushI=[],brushW=[];{let s=0;for(let y=-BR;y<=BR;y++)for(let x=-BR;x<=BR;x++){const d=Math.hypot(x,y);if(d<=BR){const w=1-d/BR;brushI.push([x,y]);brushW.push(w);s+=w}}for(let k=0;k<brushW.length;k++)brushW[k]/=s}
function grad(px,py){const ix=px|0,iy=py|0,u=px-ix,v=py-iy,a=H[idx(ix,iy)],b=H[idx(ix+1,iy)],c=H[idx(ix,iy+1)],e=H[idx(ix+1,iy+1)];return[(b-a)*(1-v)+(e-c)*v,(c-a)*(1-u)+(e-b)*u,a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+e*u*v]}
const H0=new Float32Array(H);const DROPS=1400000;
for(let n=0;n<DROPS;n++){
 let px=3+rnd()*(N-7),py=3+rnd()*(N-7),dx=0,dy=0,sp=1,w=1,sed=0;
 if(H[idx(px|0,py|0)]<1.5)continue;
 for(let l=0;l<72;l++){
  const ix=px|0,iy=py|0,u=px-ix,v=py-iy,[gx,gy,h0]=grad(px,py);
  dx=dx*.1-gx*.9;dy=dy*.1-gy*.9;const len=Math.hypot(dx,dy);if(len<1e-6)break;dx/=len;dy/=len;px+=dx;py+=dy;
  if(px<3||py<3||px>=N-4||py>=N-4)break;
  const [,,h1]=grad(px,py),dh=h1-h0;
  const cap=Math.max(-dh*sp*w*5.5,.012);
  if(sed>cap||dh>0){const dep=dh>0?Math.min(dh,sed):(sed-cap)*.28;sed-=dep;H[idx(ix,iy)]+=dep*(1-u)*(1-v);H[idx(ix+1,iy)]+=dep*u*(1-v);H[idx(ix,iy+1)]+=dep*(1-u)*v;H[idx(ix+1,iy+1)]+=dep*u*v}
  else{const er=Math.min((cap-sed)*.3,-dh);for(let k=0;k<brushI.length;k++){const q=idx(ix+brushI[k][0],iy+brushI[k][1]);if(q<0||q>=H.length)continue;const dd=er*brushW[k];H[q]-=dd;sed+=dd}}
  sp=Math.sqrt(Math.max(0,sp*sp+dh*-3.8*.6+.0));w*=.982; if(w<.02)break;
 }
}
for(let k=0;k<H.length;k++){const m=sstep(3,16,H0[k]);H[k]=H0[k]+(H[k]-H0[k])*m}
console.timeEnd('erosion');
// light blur of the very smallest noise
function blur(a,r=1){const b=new Float32Array(a);for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){b[idx(i,j)]=(a[idx(i,j)]*4+a[idx(i+1,j)]+a[idx(i-1,j)]+a[idx(i,j+1)]+a[idx(i,j-1)])/8}a.set(b)}
blur(H);
// ---- features
const LAKE={x:150,z:-70,r:92,level:7.5};
const sampleH=(x,z)=>{const fx=clamp(w2g(x),0,N-1.001),fz=clamp(w2g(z),0,N-1.001);return grad(fx,fz)[2]};
// find east coast walking from lake
function coastEast(z){for(let x=260;x<760;x+=2){if(sampleH(x,z)<0.6)return x}return 700}
// river: from lake to the SE sea through a meander
const riverCtl=[[LAKE.x+70,LAKE.z+52],[290,70],[312,160],[382,226],[430,310],[472,352],[540,420]];
function catmull(p,steps=30){const o=[];for(let i=0;i<p.length-1;i++){const a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],e=p[Math.min(p.length-1,i+2)];for(let s=0;s<steps;s++){const t=s/steps,t2=t*t,t3=t2*t;o.push([.5*(2*b[0]+(c[0]-a[0])*t+(2*a[0]-5*b[0]+4*c[0]-e[0])*t2+(3*b[0]-a[0]-3*c[0]+e[0])*t3),.5*(2*b[1]+(c[1]-a[1])*t+(2*a[1]-5*b[1]+4*c[1]-e[1])*t2+(3*b[1]-a[1]-3*c[1]+e[1])*t3)])}}o.push(p[p.length-1]);return o}
const riverPts=catmull(riverCtl,28);
// distance to river per cell, surface height along river
const riverLen=[0];for(let k=1;k<riverPts.length;k++)riverLen.push(riverLen[k-1]+Math.hypot(riverPts[k][0]-riverPts[k-1][0],riverPts[k][1]-riverPts[k-1][1]));
const total=riverLen[riverLen.length-1];
const riverSurface=t=>LAKE.level*(1-Math.pow(t,1.15))+0.04;
const river=riverPts.map((p,k)=>{const t=riverLen[k]/total;return{x:p[0],z:p[1],y:riverSurface(t),w:6+7*t+2.2*Math.sin(k*.21)}});
// runway + crash site along the east beach
const rz0=-300,rz1=150;let RX=0;{let m=0,c=0;for(let z=rz0;z<=rz1;z+=30){m+=coastEast(z);c++}RX=m/c-36}
const RUN={x:RX,z0:rz0,z1:rz1,w:30,y:2.6};
const CRASH={x:RX-6,z:rz1-20};
console.time('features');
const LV=new Float32Array(N*N); // lake depth mask for spawns
for(let j=0;j<N;j++)for(let i=0;i<N;i++){
 const x=g2w(i),z=g2w(j);let h=H[idx(i,j)];
 // beach terrace
 if(h>0&&h<7){const t=h/7;h=7*Math.pow(t,1.55)}
 // lake
 const ln=fbm(x*.011+40,z*.011,3)*26,ld=Math.hypot(x-LAKE.x,(z-LAKE.z)*1.15)+ln;
 const lm=sstep(LAKE.r+46,LAKE.r-6,ld);
 if(lm>0){const bowl=LAKE.level+1.2+ (ld-LAKE.r)*.1; const floor=LAKE.level-7.5*sstep(LAKE.r,LAKE.r-55,ld);h=mix(h,Math.min(ld<LAKE.r?floor:bowl,ld<LAKE.r?floor:Math.max(bowl,LAKE.level+.2)),lm);LV[idx(i,j)]=ld<LAKE.r?1:0}
 H[idx(i,j)]=h;
}
// river carve
const RG=4;const rcells=new Map();riverPts.forEach((p,k)=>{const c=(p[0]/48|0)+','+(p[1]/48|0);(rcells.get(c)||rcells.set(c,[]).get(c)).push(k)});
for(let j=0;j<N;j++)for(let i=0;i<N;i++){
 const x=g2w(i),z=g2w(j);let best=1e9,bk=0;
 const cx=x/48|0,cz=z/48|0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=rcells.get((cx+a)+','+(cz+b));if(!l)continue;for(const k of l){const d=(riverPts[k][0]-x)**2+(riverPts[k][1]-z)**2;if(d<best){best=d;bk=k}}}
 if(best>70*70)continue;best=Math.sqrt(best);
 const r=river[bk],bank=r.w+22,m=sstep(bank,r.w*.9,best);
 if(m>0){const bed=r.y-1.8*sstep(r.w,r.w*.35,best),banked=r.y+.35+(best-r.w)*.16;const t=best<r.w?bed:Math.max(banked,0);H[idx(i,j)]=mix(H[idx(i,j)],t,m);if(best<r.w)LV[idx(i,j)]=2}
}
// runway flatten
for(let j=0;j<N;j++)for(let i=0;i<N;i++){
 const x=g2w(i),z=g2w(j);
 const dx=Math.max(0,Math.abs(x-RUN.x)-RUN.w),dz=Math.max(0,z-RUN.z1,RUN.z0-z);
 const m=sstep(38,0,Math.hypot(dx,dz));
 if(m>0)H[idx(i,j)]=mix(H[idx(i,j)],RUN.y+fbm(x*.04,z*.04,2)*.12,m);
}
console.timeEnd('features');
blur(H);blur(H);
const gradW=(i,j)=>{i=clamp(i,1,N-2);j=clamp(j,1,N-2);return[(H[idx(i+1,j)]-H[idx(i-1,j)])/(2*S),(H[idx(i,j+1)]-H[idx(i,j-1)])/(2*S)]};
const hAt=sampleH, slopeAt=(x,z)=>{const[a,b]=gradW(Math.round(w2g(x)),Math.round(w2g(z)));return Math.hypot(a,b)};
// ---- outputs: height
const MINH=-45,MAXH=215;const U=new Uint16Array(N*N);let maxH=-1e9;for(let k=0;k<U.length;k++){U[k]=clamp((H[k]-MINH)/(MAXH-MINH))*65535;if(H[k]>maxH)maxH=H[k]}
fs.writeFileSync(path.join(OUT,'height.bin'),Buffer.from(U.buffer));
// normal + splat + map
const NM=Buffer.alloc((N-1)*(N-1)*3),SP=Buffer.alloc((N-1)*(N-1)*3),MP=Buffer.alloc((N-1)*(N-1)*3);
const forestMask=(x,z)=>sstep(-.18,.22,fbm(x*.0065+19,z*.0065-4,4));
for(let j=0;j<N-1;j++)for(let i=0;i<N-1;i++){
 const x=g2w(i+.5),z=g2w(j+.5),h=H[idx(i,j)],[gx,gz]=gradW(i,j),l=Math.hypot(gx,gz,1),q=(j*(N-1)+i)*3;
 NM[q]=(-gx/l*.5+.5)*255;NM[q+1]=(1/l*.5+.5)*255;NM[q+2]=(-gz/l*.5+.5)*255;
 const sl=Math.hypot(gx,gz),nz=fbm(x*.03,z*.03,3);
 let sand=sstep(3.6+nz*1.4,2.2+nz,h); if(LV[idx(i,j)]==2||Math.abs(h-LAKE.level)<.5&&Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r+50) sand=Math.max(sand,.7);
 let rock=clamp(sstep(.5,.85,sl+nz*.12)+sstep(92,125,h+nz*22));
 let forest=(1-sand)*(1-rock)*forestMask(x,z)*sstep(4,9,h)*sstep(112,84,h);
 SP[q]=sand*255;SP[q+1]=forest*255;SP[q+2]=rock*255;
 const g=1-Math.max(sand,forest,rock),shade=clamp(.72+(-gx*.55-gz*.45)*1.3,.3,1.25);
 let c;if(h<0){const t=sstep(-30,0,h);c=[mix(15,70,t),mix(55,165,t),mix(95,185,t)]}
 else c=[sand*216+forest*64+rock*124+g*104,sand*196+forest*92+rock*118+g*138,sand*150+forest*50+rock*112+g*66];
 if(LV[idx(i,j)]>0)c=[58,120,140];
 const s=h<0?1:shade;MP[q]=clamp(c[0]*s,0,255);MP[q+1]=clamp(c[1]*s,0,255);MP[q+2]=clamp(c[2]*s,0,255);
}
await sharp(NM,{raw:{width:N-1,height:N-1,channels:3}}).png({compressionLevel:9}).toFile(path.join(OUT,'normal.png'));
await sharp(SP,{raw:{width:N-1,height:N-1,channels:3}}).png({compressionLevel:9}).toFile(path.join(OUT,'splat.png'));
await sharp(MP,{raw:{width:N-1,height:N-1,channels:3}}).jpeg({quality:88}).toFile(path.join(OUT,'map.jpg'));
// ---- POIs
const fs2=(x,z)=>({x:+x.toFixed(1),z:+z.toFixed(1),y:+hAt(x,z).toFixed(2)});
function findSpot(cx,cz,r,test,tries=4000){let b=null,bs=-1e9;for(let t=0;t<tries;t++){const a=rnd()*6.283,d=Math.sqrt(rnd())*r,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d,s=test(x,z,hAt(x,z),slopeAt(x,z));if(s>bs){bs=s;b=[x,z]}}return fs2(b[0],b[1])}
const flat=(x,z,h,sl)=>h>2?-sl:-99;
const pois={
 crash:fs2(CRASH.x,CRASH.z), runway:RUN, lake:LAKE,
 spawn:fs2(RUN.x-10,RUN.z1-62),
 parts:{
  engine:findSpot(215,190,70,(x,z,h,sl)=>h>8&&h<40?-sl:-99),       // forest valley, south of lake
  prop:findSpot(LAKE.x-120,LAKE.z+20,60,(x,z,h,sl)=>h>LAKE.level+1?-sl:-99), // west lake shore
  wing:findSpot(-235,-205,130,(x,z,h,sl)=>h>70&&h<140?-sl*3:-99),  // mountain shelf
  gear:findSpot(60,420,110,(x,z,h,sl)=>h>1.5&&h<5?-sl:-99),        // south beach
  radio:findSpot(-330,170,120,(x,z,h,sl)=>h>20&&h<70?-sl:-99),     // wolf hills (west)
  tank:findSpot(-60,-340,90,(x,z,h,sl)=>h>25&&h<90?-sl:-99),       // north ridge
 },
 wolfDens:[],
};
pois.wolfDens=[{x:pois.parts.radio.x+14,z:pois.parts.radio.z-10},{x:pois.parts.wing.x-20,z:pois.parts.wing.z+30},{x:-40,z:60}];
pois.river=river.map(r=>[+r.x.toFixed(1),+r.z.toFixed(1),+r.y.toFixed(2),+r.w.toFixed(1)]);
// ---- spawns
const TYPES={};const out=[];
const ex=[[CRASH.x,CRASH.z,46],[pois.spawn.x,pois.spawn.z,26],...Object.values(pois.parts).map(p=>[p.x,p.z,9])];
const blocked=(x,z)=>{if(Math.abs(x-RUN.x)<RUN.w+6&&z>RUN.z0-14&&z<RUN.z1+14)return true;for(const e of ex)if((x-e[0])**2+(z-e[1])**2<e[2]**2)return true;const i=Math.round(w2g(x)),j=Math.round(w2g(z));if(i<1||j<1||i>=N-1||j>=N-1)return true;if(LV[idx(i,j)]>0)return true;return false};
const grids={big:new Map(),small:new Map()},CELL=6;
function poisson(count,minD,accept,emit,layer='big'){const grid=grids[layer];let made=0;for(let t=0;t<count;t++){const x=(rnd()-.5)*WORLD*.96,z=(rnd()-.5)*WORLD*.96,h=hAt(x,z);if(h<1.2)continue;if(blocked(x,z))continue;const v=accept(x,z,h,slopeAt(x,z));if(!v)continue;const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);let ok=true;const rr=Math.ceil(minD/CELL);for(let a=-rr;a<=rr&&ok;a++)for(let b=-rr;b<=rr&&ok;b++){const l=grid.get((ci+a)+','+(cj+b));if(l)for(const p of l)if((p[0]-x)**2+(p[1]-z)**2<(minD+p[2])**2/1){ok=false;break}}if(!ok)continue;const k=ci+','+cj;(grid.get(k)||grid.set(k,[]).get(k)).push([x,z,minD*.5]);emit(x,z,h,v);made++}return made}
const pick=a=>a[Math.floor(rnd()*a.length)];
const push=(t,x,z,y,s,r)=>{(TYPES[t]=TYPES[t]||[]).push([+x.toFixed(1),+z.toFixed(1),+y.toFixed(2),+s.toFixed(2),+r.toFixed(2)])};
const palmN=poisson(90000,5.0,(x,z,h,sl)=>h>2.7&&h<11&&sl<.42&&rnd()<.5,(x,z,h)=>push('palm',x,z,h,.85+rnd()*.5,rnd()*6.28));
const tropical=['tree_common_1','tree_common_2','tree_common_3','tree_common_4','tree_common_5','tree_tall_1','tree_tall_2','tree_tall_3','tree_tall_4','tree_tall_5'];
const bigN=poisson(30000,26,(x,z,h,sl)=>h>6&&rnd()<.16,(x,z,h)=>push(pick(['boulder_1','boulder_2']),x,z,h-.3,1+rnd()*1.2,rnd()*6.28));
const oreN=poisson(40000,14,(x,z,h,sl)=>h>34&&sl<1&&rnd()<.5,(x,z,h)=>push('ore',x,z,h,1+rnd()*.5,rnd()*6.28));
const rockN=poisson(70000,10,(x,z,h,sl)=>h>2.4&&sl<1.1&&rnd()<(h>55?.5:.035),(x,z,h)=>push(pick(['rock_1','rock_2','rock_3','rock_4']),x,z,h,.9+rnd()*.9,rnd()*6.28));
const deadN=poisson(9000,14,(x,z,h,sl)=>h>2&&h<140&&rnd()<.12,(x,z,h)=>push(pick(['tree_dead_1','tree_dead_2','tree_dead_3','tree_dead_4','tree_dead_5']),x,z,h,.8+rnd()*.4,rnd()*6.28));
const treeN=poisson(260000,5.2,(x,z,h,sl)=>{if(h<6.5||h>96||sl>.62)return 0;const f=forestMask(x,z);return rnd()<f*.62+.035?1:0},(x,z,h)=>push(h>62&&rnd()<.75?pick(['tree_pine_1','tree_pine_2','tree_pine_3','tree_pine_4']):rnd()<.09?pick(['tree_twisted_1','tree_twisted_2','tree_twisted_3']):pick(tropical),x,z,h,1.25+rnd()*.85,rnd()*6.28));
const bushN=poisson(50000,9,(x,z,h,sl)=>h>4&&h<70&&sl<.5&&rnd()<.09,(x,z,h)=>push('berry',x,z,h,.9+rnd()*.5,rnd()*6.28),'small');
const fiberN=poisson(50000,7,(x,z,h,sl)=>h>3&&h<60&&sl<.55&&rnd()<.1,(x,z,h)=>push('fiber',x,z,h,.9+rnd()*.5,rnd()*6.28),'small');
const shroomN=poisson(30000,8,(x,z,h,sl)=>h>8&&h<60&&sl<.5&&forestMask(x,z)>.5&&rnd()<.14,(x,z,h)=>push(rnd()<.72?'shroom':'shroom_red',x,z,h,.9+rnd()*.5,rnd()*6.28),'small');
const stickN=poisson(50000,6,(x,z,h,sl)=>h>2.2&&h<50&&sl<.5&&rnd()<.1,(x,z,h)=>push('stick',x,z,h,1,rnd()*6.28),'small');
const stoneN=poisson(50000,6,(x,z,h,sl)=>h>1.8&&h<50&&sl<.5&&rnd()<.09,(x,z,h)=>push('pebble',x,z,h,1,rnd()*6.28),'small');
// hand-placed loot around the crash and POIs
const add=(t,x,z,s=1)=>{const y=hAt(x,z);push(t,x,z,y,s,rnd()*6.28)};
for(let i=0;i<9;i++){const a=rnd()*6.283,d=12+rnd()*36;add(pick(['crate','crate','barrel']),CRASH.x+Math.cos(a)*d*.8,CRASH.z-20+Math.sin(a)*d*1.5)}
for(let i=0;i<14;i++){const a=rnd()*6.283,d=8+rnd()*42;add('scrap_pile',CRASH.x+Math.cos(a)*d,CRASH.z+Math.sin(a)*d)}
for(const p of Object.values(pois.parts)){for(let i=0;i<4;i++){const a=rnd()*6.283,d=7+rnd()*12;add(i==0?'crate':'scrap_pile',p.x+Math.cos(a)*d,p.z+Math.sin(a)*d)}}
fs.writeFileSync(path.join(OUT,'spawns.json'),JSON.stringify(TYPES));
fs.writeFileSync(path.join(OUT,'pois.json'),JSON.stringify({...pois,world:{N,WORLD,MINH,MAXH}}));
console.log({maxH,RX,palmN,treeN,deadN,rockN,oreN,bigN,bushN,fiberN,shroomN,stickN,stoneN,parts:pois.parts,crash:pois.crash,spawn:pois.spawn});
console.log('types',Object.entries(TYPES).map(([k,v])=>k+':'+v.length).join(' '));
