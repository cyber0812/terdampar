// Compiles vendored CC0 assets into compact runtime files under public/assets.
import fs from 'fs'; import path from 'path'; import {createRequire} from 'module';
const require=createRequire(import.meta.url); const sharp=require('/opt/npm-tools/node_modules/sharp');
const ROOT=path.resolve(import.meta.dirname,'..'), V=ROOT+'/_vendor', OUT=ROOT+'/public/assets';
for(const d of ['','/nature','/char','/animals','/props','/tex'])fs.mkdirSync(OUT+d,{recursive:true});
const NAT=V+'/assets-index/quaternius/stylized-nature-megakit/glTF', CHAR=V+'/idx-game/public/characters', PET=V+'/idx-cityofgod/assets/pets/quaternius', PROPS=V+'/idx-game/public/models', TEX=V+'/idx-game/public/textures';
const CT={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}, NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function readGltf(p){if(p.endsWith('.glb')){const b=fs.readFileSync(p),l=b.readUInt32LE(12),g=JSON.parse(b.slice(20,20+l).toString());const bin=b.slice(20+l+8);return{g,bins:[bin]}}
 const g=JSON.parse(fs.readFileSync(p));const bins=(g.buffers||[]).map(x=>x.uri.startsWith('data:')?Buffer.from(x.uri.split(',')[1],'base64'):fs.readFileSync(path.join(path.dirname(p),x.uri)));return{g,bins}}
function acc(g,bins,i){const a=g.accessors[i],v=g.bufferViews[a.bufferView],n=NC[a.type],C=CT[a.componentType],bs=C.BYTES_PER_ELEMENT,off=(a.byteOffset||0)+(v.byteOffset||0),stride=v.byteStride||n*bs,buf=bins[v.buffer];const out=new C(a.count*n);const dv=new DataView(buf.buffer,buf.byteOffset,buf.length);const rd={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];for(let k=0;k<a.count;k++)for(let c=0;c<n;c++)out[k*n+c]=dv[rd](off+k*stride+c*bs,true);return{data:out,a,n}}
// ---- nature geometry pack (quantised)
const MODELS={tree_common_1:'CommonTree_1',tree_common_2:'CommonTree_2',tree_common_3:'CommonTree_3',tree_common_4:'CommonTree_4',tree_common_5:'CommonTree_5',tree_tall_1:'TallThick_1',tree_tall_2:'TallThick_2',tree_tall_3:'TallThick_3',tree_tall_4:'TallThick_4',tree_tall_5:'TallThick_5',tree_twisted_1:'TwistedTree_1',tree_twisted_2:'TwistedTree_2',tree_twisted_3:'TwistedTree_3',tree_pine_1:'Pine_1',tree_pine_2:'Pine_2',tree_pine_3:'Pine_3',tree_pine_4:'Pine_4',tree_dead_1:'DeadTree_1',tree_dead_2:'DeadTree_2',tree_dead_3:'DeadTree_3',tree_dead_4:'DeadTree_4',tree_dead_5:'DeadTree_5',
 bush_common:'Bush_Common',bush_flower:'Bush_Common_Flowers',bush_large:'Bush_Large',bush_large_f:'Bush_Large_Flowers',bush_long:'Bush_Long_1',fern_1:'Fern_1',fern_2:'Fern_2',plant_1:'Plant_1',plant_1b:'Plant_1_Big',plant_2b:'Plant_2_Big',plant_7b:'Plant_7_Big',plant_5:'Plant_5',plant_6:'Plant_6',plant_3:'Plant_3',
 grass_short:'Grass_Common_Short',grass_tall:'Grass_Common_Tall',grass_wispy:'Grass_Wispy_Short',grass_wispy_t:'Grass_Wispy_Tall',grass_wide:'Grass_Wide_Tall',grass_wheat:'Grass_Wheat',
 flower_1:'Flower_1_Group',flower_2:'Flower_2_Group',flower_3:'Flower_3_Group',flower_4:'Flower_4_Group',flower_7:'Flower_7_Group',clover:'Clover_1',
 shroom:'Mushroom_Common',shroom_red:'Mushroom_RedCap',shroom_oy:'Mushroom_Oyster',shroom_lae:'Mushroom_Laetiporus',
 rock_1:'Rock_Medium_1',rock_2:'Rock_Medium_2',rock_3:'Rock_Medium_3',rock_4:'Rock_Medium_4',boulder_1:'Rock_Big_1',boulder_2:'Rock_Big_2',pebble_1:'Pebble_Round_1',pebble_2:'Pebble_Round_3',pebble_3:'Pebble_Square_2',pebble_4:'Pebble_Square_4'};
const chunks=[];let off=0;const manifest={};const usedTex=new Map();
function pushBuf(ta){const b=Buffer.from(ta.buffer,ta.byteOffset,ta.byteLength);const pad=(4-off%4)%4;if(pad){chunks.push(Buffer.alloc(pad));off+=pad}const o=off;chunks.push(Buffer.from(b));off+=b.length;return o}
for(const [id,file] of Object.entries(MODELS)){
 const {g,bins}=readGltf(`${NAT}/${file}.gltf`);const node=g.nodes.find(n=>n.mesh!==undefined);const mesh=g.meshes[node.mesh];const s=node.scale||[1,1,1];const parts=[];
 let bmin=[1e9,1e9,1e9],bmax=[-1e9,-1e9,-1e9];
 for(const pr of mesh.primitives){
  const pos=acc(g,bins,pr.attributes.POSITION).data,nor=acc(g,bins,pr.attributes.NORMAL).data,uv=acc(g,bins,pr.attributes.TEXCOORD_0).data,idxA=acc(g,bins,pr.indices).data;const col=pr.attributes.COLOR_0!==undefined?acc(g,bins,pr.attributes.COLOR_0):null;
  const n=pos.length/3;const mat=g.materials[pr.material];const texI=mat.pbrMetallicRoughness.baseColorTexture?.index;const texName=texI!==undefined?g.images[g.textures[texI].source].name:null;usedTex.set(texName,(usedTex.get(texName)||0)+1);
  const P=new Float32Array(n*3);for(let i=0;i<n;i++)for(let c=0;c<3;c++){const v=pos[i*3+c]*s[c];P[i*3+c]=v;bmin[c]=Math.min(bmin[c],v);bmax[c]=Math.max(bmax[c],v)}
  const NOR=new Int8Array(n*4);for(let i=0;i<n;i++){for(let c=0;c<3;c++)NOR[i*4+c]=Math.round(nor[i*3+c]*127);NOR[i*4+3]=col?Math.round((col.data[i*col.n]/(col.a.componentType==5126?1:col.a.componentType==5123?65535:255))*127):127}
  const UV=new Float32Array(uv);
  const I=n<65536?new Uint16Array(idxA):new Uint32Array(idxA);
  parts.push({mat:mat.name,tex:texName,n,i:I.length,i32:n>=65536,pos:pushBuf(P),nor:pushBuf(NOR),uv:pushBuf(UV),idx:pushBuf(I)});
 }
 manifest[id]={parts,bmin,bmax};
}
fs.writeFileSync(OUT+'/nature/nature.bin',Buffer.concat(chunks));fs.writeFileSync(OUT+'/nature/nature.json',JSON.stringify(manifest));
console.log('nature.bin',(off/1e6).toFixed(1),'MB; textures:',[...usedTex.keys()].join(' '));
// textures for nature
const LEAF=['Leaves_NormalTree','Leaves_TallThick','Leaves_TwistedTree','Leaf_Pine','Leaves','Grass','Flowers','Leaves_Square'];
for(const n of LEAF){if(!fs.existsSync(`${NAT}/${n}.png`))continue;await sharp(`${NAT}/${n}.png`).resize(n=='Leaves'?1024:512,null,{fit:'inside'}).png({compressionLevel:9,palette:false}).toFile(`${OUT}/nature/${n}.png`)}
for(const n of ['Bark_NormalTree','Bark_PineTree','Bark_TwistedTree','Bark_DeadTree','Bark_NormalTree_Normal','Bark_PineTree_Normal','Bark_TwistedTree_Normal','Bark_DeadTree_Normal','Rocks_Diffuse','Mushrooms'])await sharp(`${NAT}/${n}.png`).resize(n.startsWith('Rocks')?1024:512).removeAlpha().jpeg({quality:84}).toFile(`${OUT}/nature/${n}.jpg`);
// ---- gltf -> glb
function glb(g,binBuf,outp){const js=Buffer.from(JSON.stringify(g));const jp=Buffer.alloc((4-js.length%4)%4,0x20),bp=Buffer.alloc((4-binBuf.length%4)%4);const total=12+8+js.length+jp.length+8+binBuf.length+bp.length;const h=Buffer.alloc(12);h.writeUInt32LE(0x46546C67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(total,8);const c0=Buffer.alloc(8);c0.writeUInt32LE(js.length+jp.length,0);c0.writeUInt32LE(0x4E4F534A,4);const c1=Buffer.alloc(8);c1.writeUInt32LE(binBuf.length+bp.length,0);c1.writeUInt32LE(0x004E4942,4);fs.writeFileSync(outp,Buffer.concat([h,c0,js,jp,c1,binBuf,bp]))}
for(const a of ['Deer','Stag','Wolf','Fox','Bull']){const {g,bins}=readGltf(`${PET}/${a}.gltf`);g.buffers=[{byteLength:bins[0].length}];glb(g,bins[0],`${OUT}/animals/${a}.glb`)}
// ---- characters
for(const f of ['base_male','base_female','outfit_male_ranger','outfit_male_peasant','outfit_female_ranger','outfit_female_peasant','hair_hair_simpleparted','hair_hair_beard','hair_hair_buns','hair_hair_buzzed','hair_hair_buzzedfemale','hair_hair_long','hair_eyebrows_regular','hair_eyebrows_female']){
 const {g,bins}=readGltf(`${CHAR}/${f}.gltf`);g.buffers=[{byteLength:bins[0].length}];(g.images||[]).forEach(i=>{i.uri=i.uri});
 glb(g,bins[0],`${OUT}/char/${f}.glb`)}
for(const f of fs.readdirSync(CHAR).filter(x=>x.endsWith('.jpg'))){await sharp(`${CHAR}/${f}`).resize(1024,null,{fit:'inside',withoutEnlargement:true}).jpeg({quality:84}).toFile(`${OUT}/char/${f}`)}
// ---- animations: select clips and strip everything else
const UAL1=V+'/assets-index/quaternius/universal-animation-library/Unreal-Godot/UAL1.glb', UAL2=V+'/assets-index/quaternius/universal-animation-library-2/Unreal-Godot/UAL2.glb';
const PICK1=['Idle_Loop','Idle_Tired_Loop','Idle_LookAround_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Crouch_Idle_Loop','Crouch_Fwd_Loop','Jump_Start','Jump_Loop','Jump_Land','Swim_Fwd_Loop','Swim_Idle_Loop','Driving_Loop','Sitting_Idle_Loop','GroundSit_Idle_Loop','Death01','Death02','Hit_Chest','Hit_Head','Interact','PickUp_Kneeling','PickUp_Table','Fixing_Kneeling','Drink','Sword_Attack','Sword_Idle','Punch_Jab','Punch_Cross','Idle_Torch_Loop','Celebration','Push_Loop','Dance_Loop'];
const PICK2=['Bow_Aim_Neutral','Bow_Aim_Up','Bow_Aim_Down','Bow_Notch','Bow_Shoot','Consume','Chest_Open','Mining_Loop','TreeChopping_Loop','Walk_Carry_Loop','Farm_Harvest','OverhandThrow','Bandage_Loop','Melee_Hook','IdleToLay','LayToIdle','Idle_FoldArms_Loop','Idle_Lantern_Loop'];
function strip(file,pick){const {g,bins}=readGltf(file);const bin=bins[0];const anims=g.animations.filter(a=>pick.includes(a.name));const newB=[],views=[],accs=[];let o=0;const map=new Map();
 const remap=i=>{if(map.has(i))return map.get(i);const a=g.accessors[i],v=g.bufferViews[a.bufferView],C=CT[a.componentType],n=NC[a.type],sz=a.count*n*C.BYTES_PER_ELEMENT;const st=(a.byteOffset||0)+(v.byteOffset||0);const b=bin.slice(st,st+sz);const pad=(4-o%4)%4;if(pad){newB.push(Buffer.alloc(pad));o+=pad}newB.push(b);views.push({buffer:0,byteOffset:o,byteLength:sz});o+=sz;const aa={...a,bufferView:views.length-1};delete aa.byteOffset;accs.push(aa);map.set(i,accs.length-1);return accs.length-1};
 for(const a of anims){const keep=a.channels.filter(c=>c.target.path!=='scale');const samp=[];a.channels=keep.map(c=>{const s=a.samplers[c.sampler];samp.push({...s,input:remap(s.input),output:remap(s.output)});return{sampler:samp.length-1,target:c.target}});a.samplers=samp}
 const nodes=g.nodes.map(n=>{const c={...n};delete c.mesh;delete c.skin;return c});
 return {g:{asset:g.asset,scene:0,scenes:g.scenes,nodes,animations:anims,accessors:accs,bufferViews:views,buffers:[{byteLength:o}]},bin:Buffer.concat(newB)}}
{const a=strip(UAL1,PICK1);glb(a.g,a.bin,OUT+'/char/anims1.glb');console.log('anims1',(a.bin.length/1e6).toFixed(1),'MB',a.g.animations.length);const b=strip(UAL2,PICK2);glb(b.g,b.bin,OUT+'/char/anims2.glb');console.log('anims2',(b.bin.length/1e6).toFixed(1),'MB',b.g.animations.length)}
// ---- props & textures
for(const f of fs.readdirSync(PROPS))fs.copyFileSync(`${PROPS}/${f}`,`${OUT}/props/${f}`);
const T={sand:'coast_sand_01',grass:'leafy_grass',forest:'forest_ground_04',rock:'rock_wall_02',rock2:'dark_rock_02',planks:'old_planks_02',planks2:'dark_wooden_planks',bark:'bark_brown_02',stone:'stone_wall_04',leather:'fabric_leather_02'};
for(const [k,v] of Object.entries(T)){await sharp(`${TEX}/${v}_diff.jpg`).resize(1024).jpeg({quality:84}).toFile(`${OUT}/tex/${k}.jpg`);await sharp(`${TEX}/${v}_nor.jpg`).resize(1024).jpeg({quality:88}).toFile(`${OUT}/tex/${k}_n.jpg`)}
console.log('done');
