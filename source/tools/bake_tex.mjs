// Tileable noise for water normals, caustics and cloud shapes.
import path from 'path'; import {createRequire} from 'module';
const require=createRequire(import.meta.url); const sharp=require('/opt/npm-tools/node_modules/sharp');
const S=512; let seed=7; const R=()=>(seed=(seed*16807)%2147483647)/2147483647;
function layer(period){const g=new Float32Array(period*period).map(()=>R());return(x,y)=>{const fx=x/S*period,fy=y/S*period,ix=Math.floor(fx),iy=Math.floor(fy),u=fx-ix,v=fy-iy,uu=u*u*(3-2*u),vv=v*v*(3-2*v),a=g[(iy%period)*period+ix%period],b=g[(iy%period)*period+(ix+1)%period],c=g[((iy+1)%period)*period+ix%period],d=g[((iy+1)%period)*period+(ix+1)%period];return a+(b-a)*uu+(c-a)*vv+(a-b-c+d)*uu*vv}}
const L=[[4,.5],[8,.27],[16,.14],[32,.07],[64,.035],[128,.018]].map(([p,a])=>[layer(p),a]);
const H=new Float32Array(S*S);let lo=1e9,hi=-1e9;
for(let y=0;y<S;y++)for(let x=0;x<S;x++){let s=0;for(const [f,a] of L)s+=f(x,y)*a;H[y*S+x]=s;lo=Math.min(lo,s);hi=Math.max(hi,s)}
for(let i=0;i<H.length;i++)H[i]=(H[i]-lo)/(hi-lo);
const out=Buffer.alloc(S*S*3);
for(let y=0;y<S;y++)for(let x=0;x<S;x++){const q=(y*S+x)*3,dx=(H[y*S+(x+1)%S]-H[y*S+(x+S-1)%S])*18,dy=(H[((y+1)%S)*S+x]-H[((y+S-1)%S)*S+x])*18,l=Math.hypot(dx,dy,1);out[q]=(-dx/l*.5+.5)*255;out[q+1]=(-dy/l*.5+.5)*255;out[q+2]=H[y*S+x]*255}
await sharp(out,{raw:{width:S,height:S,channels:3}}).png({compressionLevel:9}).toFile(path.resolve(import.meta.dirname,'../public/assets/tex/waterN.png'));
