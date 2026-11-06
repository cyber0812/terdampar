import * as THREE from 'three'; import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'; import { loadGlb } from '../render/bin.js';
const wob = (x, y, z) => Math.sin(x * 2.3 + z * 1.1) * .4 + Math.sin(y * 3.1 + x * 1.7) * .33 + Math.sin(z * 2.9 - y * 2.2) * .27;
function caveGeo(c) {
  const g = new THREE.SphereGeometry(1, 44, 18, 0, Math.PI * 2, 0, Math.PI * .64), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + wob(x * 2.4, y * 2.4, z * 2.4) * .09; p.setXYZ(i, x * c.r * k, y * 7.8 * k, z * c.r * k); uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * 3); }
  const idx = g.index.array, out = []; const hole = i => { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let a = Math.atan2(z, x) - c.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) < .46 - y * .035 && y < 5.2; };
  for (let i = 0; i < idx.length; i += 3) if (!(hole(idx[i]) && hole(idx[i + 1]) && hole(idx[i + 2]))) out.push(idx[i], idx[i + 1], idx[i + 2]);
  g.setIndex(out); g.computeVertexNormals(); return g;
}
export async function addLandmarks(g) {
  const { sc: S, world: W, structs: ST } = g, P = W.pois, t = S.tex.rock.clone(); t.needsUpdate = true; const rock = S.forest.Solid({ map: t, side: THREE.DoubleSide, roughness: .95, color: S.q.tier ? 0xb0a698 : 0xffffff });
  for (const c of P.caves || []) { const m = new THREE.Mesh(caveGeo(c), rock); m.position.set(c.x, c.y - .15, c.z); m.castShadow = true; m.receiveShadow = true; S.scene.add(m); }
  const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); const gl = await loadGlb(L, 'assets/props/dutch_ship_medium.glb'), o = gl.scene, w = P.wreck;
  o.traverse(c => { if (c.isMesh) { c.castShadow = !!S.q.tier; c.receiveShadow = false; if (/sail/i.test(c.name + (c.material?.name || ''))) c.visible = false; } });
  const b0 = new THREE.Box3().setFromObject(o), sz = b0.getSize(new THREE.Vector3()), long = Math.max(sz.x, sz.z), s = 30 / long; o.scale.setScalar(s); const piv = new THREE.Group(); piv.add(o); const ctr = b0.getCenter(new THREE.Vector3()).multiplyScalar(s); o.position.set(-ctr.x, -b0.min.y * s - 3.4, -ctr.z); piv.position.set(w.x, 0, w.z); piv.rotation.set(.06, sz.x > sz.z ? 0 : Math.PI / 2, .2); S.scene.add(piv); g.wreck = piv;
  ST.colliders.push({ x0: w.x - 12, x1: w.x + 12, z0: w.z - 3.2, z1: w.z + 3.2, y0: -6, y1: 14 });
}
