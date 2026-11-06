import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js'; import { loadGlb } from '../render/bin.js';
export const ANIM = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Jump_Loop', 'Swim_Fwd_Loop', 'Swim_Idle_Loop', 'Driving_Loop', 'Walk_Carry_Loop', 'TreeChopping_Loop', 'Mining_Loop', 'Sword_Attack', 'Punch_Jab', 'Bow_Aim_Neutral', 'Bow_Shoot', 'Death01', 'Interact', 'PickUp_Kneeling', 'Consume', 'Drink', 'Fixing_Kneeling', 'Sitting_Idle_Loop', 'GroundSit_Idle_Loop', 'Celebration', 'Hit_Chest', 'Idle_Tired_Loop', 'Idle_Torch_Loop', 'Sword_Idle'];
const LOOP = n => /_Loop$|Bow_Aim_Neutral|Sword_Idle/.test(n);
export class CharLib {
  constructor(q) { this.q = q || { tier: 2 }; this.loader = new GLTFLoader(); this.src = {}; this.clips = {}; this.animals = {}; }
  async load(progress) {
    const L = u => loadGlb(this.loader, u); const list = ['base_male', 'base_female', 'outfit_male_peasant', 'outfit_male_ranger', 'outfit_female_peasant', 'outfit_female_ranger', 'hair_hair_simpleparted', 'hair_hair_buzzed', 'hair_hair_long', 'hair_hair_buns', 'hair_hair_buzzedfemale', 'hair_hair_beard', 'hair_eyebrows_regular', 'hair_eyebrows_female'];
    const tot = list.length + 7; let k = 0; const tick = () => progress && progress(++k / tot);
    await Promise.all(list.map(async n => { this.src[n] = await L(`assets/char/${n}.glb`); tick(); }));
    for (const f of ['anims1', 'anims2']) { const g = await L(`assets/char/${f}.glb`); for (const c of g.animations) { c.tracks = c.tracks.filter(t => !/\.scale$/.test(t.name)); this.clips[c.name] = c; } tick(); }
    await Promise.all(['Deer', 'Stag', 'Wolf', 'Fox', 'Bull'].map(async n => { const g = await L(`assets/animals/${n}.glb`); g.scene.traverse(o => { if (o.isMesh) { o.castShadow = !!this.q.tier; o.frustumCulled = false; if (o.material) { o.material.roughness = .9; o.material.metalness = 0; } } }); this.animals[n] = g; tick(); }));
    this.prepare();
    if (!this.q.tier) for (const s of Object.values(this.src)) (s.scene || { traverse() { } }).traverse(o => { const m = o.material; if (m) { m.normalMap = null; m.roughnessMap = null; m.metalnessMap = null; m.aoMap = null; m.needsUpdate = true; } });
  }
  prepare() { // trim the heavy body down to the head + neck
    for (const g of ['male', 'female']) {
      const base = this.src['base_' + g]; let head = null, skinned = [];
      base.scene.traverse(o => { if (o.isSkinnedMesh) { skinned.push(o); if (/superhero/i.test(o.name)) head = o; } });
      const skel = head.skeleton, keep = new Set(); skel.bones.forEach((b, i) => { if (/^(Head|neck_0\d|neck)/i.test(b.name)) keep.add(i); });
      const si = head.geometry.attributes.skinIndex, sw = head.geometry.attributes.skinWeight, idx = head.geometry.index.array, out = [];
      const top = v => { let m = 0, t = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > m) { m = w; t = si.getComponent(v, k); } } return t; };
      for (let i = 0; i < idx.length; i += 3) if (keep.has(top(idx[i])) && keep.has(top(idx[i + 1])) && keep.has(top(idx[i + 2]))) out.push(idx[i], idx[i + 1], idx[i + 2]);
      head.geometry = head.geometry.clone(); head.geometry.setIndex(out); this.src['head_' + g] = skinned;
    }
  }
  create(look = {}) {
    const g = look.g === 'f' ? 'female' : 'male', outfit = look.outfit === 'ranger' ? 'ranger' : 'peasant', src = this.src[`outfit_${g}_${outfit}`], root = skClone(src.scene); let skel = null; const meshes = [];
    root.traverse(o => { if (o.isSkinnedMesh) { skel = o.skeleton; meshes.push(o); o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; if (/Hood/i.test(o.name)) o.visible = false; if (o.material) { o.material = o.material.clone(); const low = /Ranger|Peasant/.test(o.material.name); if (low && look.shirt) o.material.color.set(look.shirt).lerp(new THREE.Color(1, 1, 1), .55); } } });
    const bone = n => skel.bones.find(b => b.name === n), addSk = (src, tint) => { const m = new THREE.SkinnedMesh(src.geometry, src.material.clone()); m.bind(skel, src.bindMatrix.clone()); m.frustumCulled = false; m.castShadow = true; if (tint) m.material.color.set(tint); skel.bones[0].parent.add(m); meshes.push(m); return m; };
    for (const m of this.src['head_' + g]) addSk(m, null);
    const hairs = look.hair || (g === 'male' ? 'simpleparted' : 'long'); const hc = look.hairC || '#3a2616';
    this.src['hair_hair_' + hairs]?.scene.traverse(o => { if (o.isSkinnedMesh) addSk(o, hc); });
    if (look.beard && g === 'male') this.src.hair_hair_beard.scene.traverse(o => { if (o.isSkinnedMesh) addSk(o, hc); });
    const ch = new Character(root, skel, bone, this.clips, meshes); return ch;
  }
  createAnimal(sp) {
    const g = this.animals[sp], inner = skClone(g.scene), root = new THREE.Group(); root.add(inner); const H = { Deer: 1.5, Stag: 1.85, Wolf: .95, Fox: .55, Bull: 1.65 }[sp]; if (!g.h0) { const b = new THREE.Box3().setFromObject(g.scene); g.h0 = b.max.y - b.min.y; } inner.scale.setScalar(H / g.h0 * (inner.scale.x || 1)); const mixer = new THREE.AnimationMixer(inner), actions = {}; root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    for (const c of g.animations) actions[c.name] = mixer.clipAction(c); return { root, mixer, actions, cur: null };
  }
}
export class Character {
  constructor(root, skel, bone, clips, meshes) {
    this.root = new THREE.Group(); this.root.add(root); this.skin = root; this.skel = skel; this.bone = bone; this.mixer = new THREE.AnimationMixer(root); this.clips = clips; this.actions = {}; this.cur = null; this.meshes = meshes; this.hand = bone('hand_r'); this.handL = bone('hand_l'); this.head = bone('Head'); this.item = null;
  }
  action(n) { if (this.actions[n]) return this.actions[n]; const c = this.clips[n]; if (!c) return null; const a = this.mixer.clipAction(c); if (!LOOP(n)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } return this.actions[n] = a; }
  play(n, fade = .18, ts = 1) { if (this.cur === n) { const a = this.actions[n]; if (a) a.timeScale = ts; return; } const a = this.action(n); if (!a) return; const old = this.curA; a.reset(); a.enabled = true; a.timeScale = ts; a.setEffectiveWeight(1); a.play(); if (old) old.crossFadeTo(a, fade, false); this.cur = n; this.curA = a; }
  hold(n, t, fade = .16) { this.play(n, fade, 0); const a = this.actions[n]; if (a) a.time += (t - a.time) * .25; }
  setItem(obj, left) { if (this.item) this.item.parent?.remove(this.item); this.item = obj; if (obj) (left ? this.handL : this.hand).add(obj); }
  setVisible(v) { this.root.visible = v; }
  update(dt) { this.mixer.update(dt); }
  dispose() { this.mixer.stopAllAction(); }
}
