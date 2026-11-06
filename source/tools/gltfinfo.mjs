import fs from 'fs';
function readGltf(p){
  const b=fs.readFileSync(p);
  if(p.endsWith('.glb')){const len=b.readUInt32LE(12);return JSON.parse(b.slice(20,20+len).toString());}
  return JSON.parse(b.toString());
}
for(const p of process.argv.slice(2)){
  const g=readGltf(p);
  const tris=(g.meshes||[]).reduce((s,m)=>s+m.primitives.reduce((a,pr)=>{const acc=g.accessors[pr.indices??pr.attributes.POSITION];return a+(acc.count/3|0)},0),0);
  console.log(`\n# ${p.split('/').pop()} nodes=${g.nodes?.length} meshes=${g.meshes?.length} tris=${tris} skins=${g.skins?.length||0} joints=${g.skins?.[0]?.joints?.length||0} mats=${(g.materials||[]).map(m=>m.name).join(',')} tex=${(g.images||[]).length}`);
  if(g.animations?.length) console.log(' anims('+g.animations.length+'): '+g.animations.map(a=>a.name).join(' '));
}
