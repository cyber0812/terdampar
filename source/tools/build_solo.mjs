// Builds the phone version: the server's Room runs in the page, no Node needed.
import fs from 'fs'; import path from 'path'; import {createRequire} from 'module';
const require=createRequire(import.meta.url); const esbuild=require('esbuild'); const root=path.resolve(import.meta.dirname,'..'), D=root+'/dist/solo';
fs.rmSync(D,{recursive:true,force:true}); fs.mkdirSync(D,{recursive:true});
const alias={'three/addons':root+'/node_modules/three/examples/jsm','three':root+'/node_modules/three/build/three.module.js','fs':root+'/client/shim/fs.js','path':root+'/client/shim/path.js'};
await esbuild.build({entryPoints:[root+'/client/solo.js'],bundle:true,format:'esm',outfile:D+'/game.js',minify:true,target:['es2020','safari15'],alias,define:{'process.env.DEV':'window.__dev','process.env.PORT':'""'},logLevel:'warning'});
fs.copyFileSync(root+'/public/style.css',D+'/style.css');fs.copyFileSync(root+'/public/manifest.webmanifest',D+'/manifest.webmanifest');fs.cpSync(root+'/public/icons',D+'/icons',{recursive:true});
fs.cpSync(root+'/public/world',D+'/world',{recursive:true}); fs.cpSync(root+'/public/assets',D+'/assets',{recursive:true});
const keep=new Set(['stone_fire_pit.glb','wooden_crate_01.glb','wooden_barrels_01.glb','treasure_chest.glb','dutch_ship_medium.glb']); for(const f of fs.readdirSync(D+'/assets/props'))if(!keep.has(f))fs.rmSync(D+'/assets/props/'+f);
for(const f of ['rock2.jpg','rock2_n.jpg'])fs.rmSync(D+'/assets/tex/'+f,{force:true});
fs.rmSync(D+'/assets/fonts/OFL.txt',{force:true});
// phones get lighter textures: less to download, far less GPU memory
const sharp=require('/opt/npm-tools/node_modules/sharp');
for(const f of (function w(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?w(d+'/'+e.name):[d+'/'+e.name])})(D+'/assets'))if(/\.jpg$/.test(f)){const b=await sharp(f).resize(512,512,{fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer();fs.writeFileSync(f,b)}
// binaries become base64 json: the page host serves plain web types only
for(const f of (function w(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?w(d+'/'+e.name):[d+'/'+e.name])})(D))if(/\.(glb|bin)$/.test(f)){fs.writeFileSync(f+'.json',JSON.stringify(fs.readFileSync(f).toString('base64')));fs.rmSync(f)}
// page for the Artifact wrapper: no doctype/html/head/body
let h=fs.readFileSync(root+'/public/index.html','utf8');
const head=`<title>Catlyn Terdampar</title>\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n<link rel="stylesheet" href="style.css">\n<style>:root{color-scheme:dark;background:#0a1419}</style>\n`;
const body=h.slice(h.indexOf('<body>')+6,h.indexOf('</body>'));
fs.writeFileSync(D+'/page.html',head+body);
// local test page keeps a real document
fs.writeFileSync(D+'/index.html',h);fs.writeFileSync(D+'/.nojekyll','');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const all=walk(D).map(f=>f.slice(D.length+1)).filter(f=>f!=='page.html'&&f!=='index.html'), CT={}; const map={};
for(const f of all){const ct=CT[path.extname(f)];map[f]=ct?{from:f,contentType:ct}:f}
fs.writeFileSync(root+'/dist/solo-files.json',JSON.stringify(map));
const tot=all.reduce((s,f)=>s+fs.statSync(D+'/'+f).size,0), big=all.map(f=>[fs.statSync(D+'/'+f).size,f]).sort((a,b)=>b[0]-a[0]).slice(0,4);
console.log('files',all.length,'MB',(tot/1e6).toFixed(1),'biggest',big.map(b=>(b[0]/1e6).toFixed(1)+' '+b[1]).join(', '),'game.js',(fs.statSync(D+'/game.js').size/1e6).toFixed(2));
