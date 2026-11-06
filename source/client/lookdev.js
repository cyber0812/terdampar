import * as THREE from 'three'; import { WorldData } from '../shared/world.js'; import { GameScene } from './render/scene.js';
const q = new URLSearchParams(location.search);
(async () => {
  const [hb, pois, sp] = await Promise.all([fetch('world/height.bin').then(r => r.arrayBuffer()), fetch('world/pois.json').then(r => r.json()), fetch('world/spawns.json').then(r => r.json())]);
  const world = new WorldData(new Uint16Array(hb), pois, sp); const canvas = document.getElementById('c');
  const g = new GameScene(canvas, world, q.get('q') || 'med'); await g.load(); window.G = g; g.time = +(q.get('t') || .38);
  const x = +(q.get('x') || pois.spawn.x), z = +(q.get('z') || pois.spawn.z), yaw = +(q.get('yaw') || 0), pitch = +(q.get('pitch') || 0), alt = +(q.get('alt') || 1.7);
  g.camera.position.set(x, Math.max(world.height(x, z), 0) + alt, z); g.camera.rotation.order = 'YXZ'; g.camera.rotation.set(pitch, yaw, 0);
  for (let i = 0; i < 3; i++) { g.frame(.016); await new Promise(r => setTimeout(r, 30)); }
  const inf = g.renderer.info.render; console.log('calls', inf.calls, 'tris', inf.triangles, 'bb', g.forest.bb.geometry.instanceCount, g.forest.bbA.slice(0,8).join(','), g.forest.bbB.slice(0,4).join(','), JSON.stringify(g.forest.vis.tree_common_1.bb)); window.DONE = 1;
})().catch(e => { console.log('ERR ' + e.stack); window.DONE = 1; });
window.dumpAtlas=()=>{const G=window.G,rt=G.forest.bbU.tAtlas.value;return rt.image?[rt.image.width,rt.image.height]:null};
