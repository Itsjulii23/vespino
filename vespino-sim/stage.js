// The Vespino's stage: a pale studio, soft boxes for the clear coat to catch, a soft shadow on an invisible floor and a
// road of dashes that rolls under the bike at the wheel's own speed. frame(cam) draws one frame.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {buildBike} from './bike.js';

const V3 = THREE.Vector3;
export const BG = {top: '#dfe8ee', mid: '#eef0ee', low: '#d9dcd8'};

export function createStage({canvas}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, BG.top);
    gr.addColorStop(0.55, BG.mid);
    gr.addColorStop(1, BG.low);
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
  }
  const camera = new THREE.PerspectiveCamera(26, 16 / 9, 0.05, 60);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 8}));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());

  // the soft boxes
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#d9dadd');
    {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 256;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#8fb4dc');
      gr.addColorStop(0.42, '#e9f0f6');
      gr.addColorStop(0.5, '#f4f1ea');
      gr.addColorStop(0.52, '#5f625f');
      gr.addColorStop(1, '#3b3d3c');
      g.fillStyle = gr;
      g.fillRect(0, 0, 4, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 16), new THREE.MeshBasicMaterial({map: t, side: THREE.BackSide})));
    }
    const box = (w, h, pos, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(12, 12, new V3(0, 14, 2), 2.6);
    box(3, 14, new V3(-12, 4, 6), 3.4);
    box(3, 14, new V3(12, 4, -4), 2.2);
    box(18, 2, new V3(0, 2, 14), 1.6);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.02).texture;
    scene.environmentIntensity = 1.0;
    pm.dispose();
  }
  const sun = new THREE.DirectionalLight('#fff3e2', 2.6);
  sun.position.set(-1.0, 3.4, 2.2);
  sun.target.position.set(0.55, 0, 0);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 0.5, far: 9});
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.radius = 10;
  sun.shadow.blurSamples = 20;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.003;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#e8f1fa', '#9b9d98', 0.55));

  const asphalt = (() => {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.fillStyle = '#8a8c8e';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '40,42,44' : '190,192,194'},${0.05 + rnd() * 0.08})`;
      g.beginPath();
      g.ellipse(rnd() * S, rnd() * S, 60 + rnd() * 220, 40 + rnd() * 160, rnd() * 3, 0, 7);
      g.fill();
    }
    for (let i = 0; i < 52000; i++) {
      const v = rnd();
      g.fillStyle = v < 0.5 ? `rgba(30,32,34,${0.12 + rnd() * 0.25})` : `rgba(215,217,219,${0.1 + rnd() * 0.25})`;
      const r = 0.6 + rnd() * 1.6;
      g.fillRect(rnd() * S, rnd() * S, r, r);
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      let x = rnd() * S;
      let y = rnd() * S;
      let a = rnd() * 6.28;
      const w = 1 + rnd() * 2.2;
      const pts = [[x, y]];
      for (let k = 0; k < 40; k++) {
        a += (rnd() - 0.5) * 1.1;
        x += Math.cos(a) * (14 + rnd() * 22);
        y += Math.sin(a) * (14 + rnd() * 22);
        pts.push([x, y]);
      }
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S], [S, S], [-S, -S], [S, -S], [-S, S]]) {
        g.strokeStyle = 'rgba(22,23,25,.85)';
        g.lineWidth = w;
        g.beginPath();
        pts.forEach(([px, py], k) => (k ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy)));
        g.stroke();
        g.strokeStyle = 'rgba(205,207,209,.35)';
        g.lineWidth = 0.8;
        g.beginPath();
        pts.forEach(([px, py], k) => (k ? g.lineTo(px + ox + 1.5, py + oy + 1.5) : g.moveTo(px + ox + 1.5, py + oy + 1.5)));
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
    t.anisotropy = 8;
    return t;
  })();
  const TILE = 3; // metres per texture repeat
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({map: asphalt, bumpMap: asphalt, bumpScale: 1.4, roughness: 0.92, metalness: 0}));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0.55, -0.002, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  scene.fog = new THREE.Fog('#e3e6e2', 5.5, 15);
  // soft contact shadows under the tyres and a broad one under the whole bike
  const blobTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.9)');
    gr.addColorStop(0.5, 'rgba(0,0,0,.4)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  for (const [x, w, d, o] of [[0, 0.34, 0.1, 0.55], [1.1, 0.34, 0.1, 0.55], [0.55, 1.7, 0.42, 0.3]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({map: blobTex, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6}));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.0015, 0);
    scene.add(m);
  }
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({color: '#5d636c', opacity: 0.34, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8}));
  shade.rotation.x = -Math.PI / 2;
  shade.receiveShadow = true;
  scene.add(shade);

  // the road: lane dashes that slide under the bike and shrink away at both ends
  const N = 26;
  const GAP = 0.7;
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 0.035), new THREE.MeshBasicMaterial({color: '#e9e8df', transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2}), N * 2);
  dashes.frustumCulled = false;
  scene.add(dashes);
  const o = new THREE.Object3D();
  const road = (dist) => {
    const span = N * GAP;
    let i = 0;
    for (const z of [0.78, -0.78]) {
      for (let k = 0; k < N; k++) {
        const x = ((((k * GAP - dist) % span) + span) % span) - span / 2 + 0.55;
        const fade = Math.max(0, 1 - Math.abs(x - 0.55) / (span / 2));
        o.position.set(x, 0.002, z);
        o.rotation.set(-Math.PI / 2, 0, 0);
        o.scale.setScalar(Math.min(1, fade * 2.4));
        o.updateMatrix();
        dashes.setMatrixAt(i++, o.matrix);
      }
    }
    dashes.instanceMatrix.needsUpdate = true;
    asphalt.offset.x = (dist / TILE) * (10 / 10) * (1 / 1) * (TILE / 3);
  };

  const bike = buildBike();
  scene.add(bike.root);
  const clip = new THREE.Plane(new V3(0, 0, -1), 0);

  const size = {w: 1600, h: 900};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  // cam: target (tx, ty, tz), azimuth from +z toward +x (0 is the bike's left side), elevation, distance, sx/sy screen shift
  const frame = (cam) => {
    const {tx, ty, tz, az, el, d} = cam;
    camera.position.set(tx + d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(size.w, size.h, -(cam.sx ?? 0), -(cam.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
    // on slower tiers the sun's shadow map is redrawn every few frames
    renderer.shadowMap.autoUpdate = shadowEvery <= 1;
    if (shadowEvery > 1 && fc++ % shadowEvery === 0) renderer.shadowMap.needsUpdate = true;
    composer.render();
  };
  const pv = new V3();
  const project = (p) => {
    pv.copy(p).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  let shadowEvery = 1;
  let fc = 0;
  const setQuality = ({samples, shadow, every, blur}) => {
    if (every !== undefined) shadowEvery = every;
    if (blur) {
      sun.shadow.radius = blur[0];
      sun.shadow.blurSamples = blur[1];
    }
    if (samples !== undefined) {
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        t.samples = samples;
        t.dispose();
      }
    }
    if (shadow !== undefined) {
      sun.shadow.mapSize.set(shadow, shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
  };
  let clipped = null;
  const setCut = (mode) => {
    bike.setCut(mode);
    if (mode === clipped) return;
    clipped = mode;
    const planes = mode === 'section' ? [clip] : null;
    bike.root.traverse((o) => {
      for (const m of [].concat(o.material || [])) m.clippingPlanes = planes;
    });
    for (const m of bike.extraMats) m.clippingPlanes = planes;
  };
  return {renderer, scene, camera, composer, sun, bike, resize, frame, project, size, setQuality, setCut, road};
}
