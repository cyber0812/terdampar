// Adds the sand islet with the shipwreck and two caves without touching existing entity ids.
import fs from 'fs'; import path from 'path'; import {createRequire} from 'module';
const require=createRequire(import.meta.url); const sharp=require('/opt/npm-tools/node_modules/sharp');
const T=path.resolve(import.meta.dirname), W=path.resolve(T,'../public/world');
const pois=JSON.parse(fs.readFileSync(T+'/pois.orig.json')), spawns=JSON.parse(fs.readFileSync(T+'/spawns.orig.json'));
const {N,WORLD,MINH,MAXH}=pois.world, S=WORLD/(N-1); const hb=fs.readFileSync(T+'/height.orig.bin'), U=new Uint16Array(hb.buffer.slice(hb.byteOffset,hb.byteOffset+hb.length));
const H=new Float32Array(N*N); for(let i=0;i<H.length;i++)H[i]=MINH+U[i]/65535*(MAXH-MINH);
const g2w=v=>v*S-WORLD/2,w2g=v=>(v+WORLD/2)/S; const hAt=(x,z)=>{const fx=Math.max(0,Math.min(N-1.001,w2g(x))),fz=Math.max(0,Math.min(N-1.001,w2g(z))),i=fx|0,j=fz|0,u=fx-i,v=fz-j,q=j*N+i;return H[q]*(1-u)*(1-v)+H[q+1]*u*(1-v)+H[q+N]*(1-u)*v+H[q+N+1]*u*v};
const slope=(x,z,r)=>{let lo=1e9,hi=-1e9;for(let a=0;a<6.28;a+=.52)for(const k of [.4,.7,1]){const h=hAt(x+Math.cos(a)*r*k,z+Math.sin(a)*r*k);lo=Math.min(lo,h);hi=Math.max(hi,h)}return hi-lo};
// islet: 95 m off the south-east shore, visible from the beach walk
let isl=null; for(let a=1.0;a<2.2;a+=.05){let r=300;while(hAt(Math.cos(a)*r,Math.sin(a)*r)>0&&r<760)r+=2;const d=r+95,x=Math.cos(a)*d,z=Math.sin(a)*d,h=hAt(x,z);if(Math.abs(x)>700||Math.abs(z)>700)continue;if(!isl||h<isl.h&&a<1.5)isl={x,z,h,a}}
isl.x=+isl.x.toFixed(1);isl.z=+isl.z.toFixed(1);const R0=19;
const touched=new Set(); for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=g2w(i),z=g2w(j),dx=x-isl.x,dz=z-isl.z,r=Math.hypot(dx,dz*1.25);if(r>70)continue;const an=Math.atan2(dz,dx),wob=1+.16*Math.sin(an*3+1)+.1*Math.sin(an*5);const rr=r/wob;const sh=rr<R0?1.45*(1-(rr/R0)**2)+.05:-(rr-R0)*.34;if(sh>H[j*N+i]){H[j*N+i]=sh;touched.add(j*N+i)}}
// caves
const big=[];for(const[t,l]of Object.entries(spawns))if(/^(tree_|palm|rock_|boulder|ore)/.test(t))for(const e of l)big.push(e);
const parts=Object.values(pois.parts);
function findCave(cx,cz,R){let b=null;for(let t=0;t<6000;t++){const a=(t*2.399)%6.283,d=Math.sqrt(t/6000)*R,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d,h=hAt(x,z);if(h<13||h>74)continue;const sl=slope(x,z,13);if(sl>7)continue;if(big.some(e=>(e[0]-x)**2+(e[1]-z)**2<13.5**2))continue;if(parts.some(p=>(p.x-x)**2+(p.z-z)**2<34**2))continue;if(pois.wolfDens.some(p=>(p.x-x)**2+(p.z-z)**2<26**2))continue;if(Math.hypot(x-pois.lake.x,z-pois.lake.z)<pois.lake.r+50)continue;if(pois.river.some(r=>(r[0]-x)**2+(r[1]-z)**2<26**2))continue;if(!b||sl<b.sl)b={x,z,sl}}return b}
const c1=findCave(250,250,170)||findCave(120,300,240),c2=findCave(-230,-120,200);console.log('caves',c1,c2);
const caves=[c1,c2].filter(Boolean).map(c=>{const x=+c.x.toFixed(1),z=+c.z.toFixed(1);let best=0,lo=1e9;for(let a=0;a<6.28;a+=.2){const h=hAt(x+Math.cos(a)*16,z+Math.sin(a)*16);if(h<lo){lo=h;best=a}}return{x,z,y:+hAt(x,z).toFixed(2),r:11.5,dir:+best.toFixed(2)}});
// move small pickups out of the caves, ids stay the same
for(const c of caves)for(const[t,l]of Object.entries(spawns)){if(/^(tree_|palm|rock_|boulder|ore)/.test(t))continue;for(const e of l){const dx=e[0]-c.x,dz=e[1]-c.z,d=Math.hypot(dx,dz);if(d<13.5&&d>.01){e[0]=+(c.x+dx/d*15).toFixed(1);e[1]=+(c.z+dz/d*15).toFixed(1);e[2]=+hAt(e[0],e[1]).toFixed(2)}}}
const add=(t,x,z,s=1,r=0)=>{(spawns[t]=spawns[t]||[]).push([+x.toFixed(1),+z.toFixed(1),+hAt(x,z).toFixed(2),s,+r.toFixed(2)])};
let rs=4242;const R=()=>(rs=(rs*16807)%2147483647)/2147483647;
for(const c of caves){const back=c.dir+Math.PI;add('treasure',c.x+Math.cos(back)*7.6,c.z+Math.sin(back)*7.6,1,back);for(let i=0;i<3;i++){const a=back+(i-1)*.9,d=6.6;add('cave_ore',c.x+Math.cos(a)*d,c.z+Math.sin(a)*d,1.1,a)}for(let i=0;i<7;i++){const a=R()*6.28,d=4+R()*5.5;add('crystal',c.x+Math.cos(a)*d,c.z+Math.sin(a)*d,.8+R()*.7,a)}add('crate2',c.x+Math.cos(back+1.4)*8,c.z+Math.sin(back+1.4)*8,1,1)}
add('treasure',isl.x-3,isl.z+5,1,1.2);add('crate2',isl.x+6,isl.z+4,1,.4);add('crate2',isl.x-8,isl.z-1,1,2.2);add('crate2',isl.x+2,isl.z+9,1,.8);
pois.islet={x:isl.x,z:isl.z,r:R0};pois.wreck={x:isl.x+1,z:isl.z-7,y:.2};pois.caves=caves;
const Uo=new Uint16Array(N*N);for(let i=0;i<Uo.length;i++)Uo[i]=Math.max(0,Math.min(1,(H[i]-MINH)/(MAXH-MINH)))*65535;fs.writeFileSync(W+'/height.bin',Buffer.from(Uo.buffer));fs.writeFileSync(W+'/spawns.json',JSON.stringify(spawns));fs.writeFileSync(W+'/pois.json',JSON.stringify(pois));
// patch the baked images around the islet
const P=N-1, pad=(70+6)/S|0, ci=w2g(isl.x)|0, cj=w2g(isl.z)|0;
const nr=await sharp(T+'/normal.orig.png').removeAlpha().raw().toBuffer(), sr=await sharp(T+'/splat.orig.png').removeAlpha().raw().toBuffer(), mr=await sharp(T+'/map.orig.jpg').removeAlpha().raw().toBuffer();
for(let j=Math.max(1,cj-pad);j<Math.min(P-1,cj+pad);j++)for(let i=Math.max(1,ci-pad);i<Math.min(P-1,ci+pad);i++){const q=(j*P+i)*3,gx=(H[j*N+i+1]-H[j*N+i-1])/(2*S),gz=(H[(j+1)*N+i]-H[(j-1)*N+i])/(2*S),l=Math.hypot(gx,gz,1),h=H[j*N+i];nr[q]=(-gx/l*.5+.5)*255;nr[q+1]=(1/l*.5+.5)*255;nr[q+2]=(-gz/l*.5+.5)*255;if(touched.has(j*N+i)){sr[q]=255;sr[q+1]=0;sr[q+2]=0;const t=Math.max(0,Math.min(1,(h+30)/30));if(h>0){mr[q]=216;mr[q+1]=196;mr[q+2]=150}else{mr[q]=15+55*t;mr[q+1]=55+110*t;mr[q+2]=95+90*t}}}
await sharp(nr,{raw:{width:P,height:P,channels:3}}).png({compressionLevel:9}).toFile(W+'/normal.png');await sharp(sr,{raw:{width:P,height:P,channels:3}}).png({compressionLevel:9}).toFile(W+'/splat.png');await sharp(mr,{raw:{width:P,height:P,channels:3}}).jpeg({quality:88}).toFile(W+'/map.jpg');
console.log('islet',pois.islet,'wreck',pois.wreck,'caves',JSON.stringify(caves),'new',Object.keys(spawns).slice(-4).map(k=>k+':'+spawns[k].length).join(' '));
