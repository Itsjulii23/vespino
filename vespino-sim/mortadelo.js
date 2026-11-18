// The Mortadelo modelled in Blender (blender/scripts/mortadelo_*.py), exported by export_maqueta.py in the page's own
// coordinates (metres, x forward, y up, z to the rider's left, rear axle at the origin). The build inlines the .glb
// as base64, so the page still opens from file:// with no network. loadMortadelo() must finish before buildBike().
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import glb from './mortadelo.glb';
import {GLB_IDS} from './glb-ids.js';

export {GLB_IDS};
const parts = new Map();

function toBuffer(b64) {
  const bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function loadMortadelo() {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(toBuffer(glb), '', (gltf) => {
      gltf.scene.updateMatrixWorld(true);
      for (const node of gltf.scene.children) parts.set(node.name, node);
      const missing = GLB_IDS.filter((id) => !parts.has(id));
      if (missing.length) return reject(new Error('mortadelo.glb sin piezas: ' + missing.join(', ')));
      if (typeof window !== 'undefined') window.__vespino = {...(window.__vespino || {}), glbIds: [...parts.keys()]};
      resolve();
    }, reject);
  });
}

// A fresh copy of one part, placed where it sits on the bike, every mesh tagged with userData.part = id.
// Materials are still the GLB's; bike.js swaps them for its own so paint, cutaways and highlight keep working.
export function mortadeloPart(id) {
  const src = parts.get(id);
  if (!src) return null;
  const o = src.clone(true);
  o.traverse((m) => { if (m.isMesh) { m.userData.part = id; m.castShadow = true; m.receiveShadow = true; } });
  return o;
}
