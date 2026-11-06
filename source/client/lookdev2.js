import * as THREE from 'three'; import { WorldData } from '../shared/world.js'; import { GameScene } from './render/scene.js'; import { CharLib } from './game/chars.js';
const q = new URLSearchParams(location.search);
(async () => {
  const [hb, pois, sp] = await Promise.all([fetch('world/height.bin').then(r => r.arrayBuffer()), fetch('world/pois.json').then(r => r.json()), fetch('world/spawns.json').then(r => r.json())]);
  const world = new WorldData(new Uint16Array(hb), pois, sp); const canvas = document.getElementById('c');
  const g = new GameScene(canvas, world, 'med'); await g.load(); window.G = g; g.time = .4;
  const lib = new CharLib(); await lib.load(); console.log('clips', Object.keys(lib.clips).length);
  const x = pois.spawn.x + 8, z = pois.spawn.z + 2, y = world.height(x, z); console.log(lib.src.outfit_male_peasant.scene.getObjectByName('hand_r') ? 'hand ok' : 'no hand');
  const looks = [{ g: 'm', outfit: 'peasant', beard: 1 }, { g: 'f', outfit: 'peasant', hair: 'long', hairC: '#6a3a1a' }, { g: 'm', outfit: 'ranger', hair: 'buzzed', hairC: '#2a1a10' }, { g: 'f', outfit: 'ranger', hair: 'buns', hairC: '#c9a24a' }];
  const an = ['Idle_Loop', 'Jog_Fwd_Loop', 'TreeChopping_Loop', 'Bow_Aim_Neutral']; const chars = [];
  looks.forEach((l, i) => { const c = lib.create(l); c.root.position.set(x + i * 1.5, y, z); c.root.rotation.y = -.5 + Math.PI * 0; g.scene.add(c.root); c.play(an[i], 0); chars.push(c); });
  for (const [i, sp2] of ['Deer', 'Wolf', 'Bull'].entries()) { const a = lib.createAnimal(sp2); a.root.position.set(x + i * 2.5, world.height(x + i * 2.5, z - 4), z - 4); g.scene.add(a.root); a.actions.Idle.play(); a.mixer.update(.4); }
  g.camera.position.set(x + 2.4, y + 1.5, z + 3.9); g.camera.lookAt(x + 2.1, y + .9, z); chars.forEach(c => c.update(.5));
  for (let i = 0; i < 3; i++) { g.frame(.016); await new Promise(r => setTimeout(r, 30)); } window.DONE = 1;
})().catch(e => { console.log('ERR ' + e.stack); window.DONE = 1; });
