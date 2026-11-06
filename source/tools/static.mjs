import http from 'http'; import fs from 'fs'; import path from 'path';
const root=process.argv[2]||'.'; const port=+process.argv[3]||8099;
const mime={'.css':'text/css','.woff2':'font/woff2','.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.bin':'application/octet-stream','.json':'application/json','.fbx':'application/octet-stream'};
http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(root,u);fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(b)})}).listen(port,()=>console.log('up',port));
