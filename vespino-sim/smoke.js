// Two-stroke exhaust smoke: camera-facing quads drawn in one instanced call (size, opacity and spin per puff; quads, not
// GL points, because many GPUs cap the point size far below a puff seen up close). Puffs leave the tail
// pipe in pulses that follow the firing rate, push backwards, rise, swell and thin out; at speed the air drags them back.
import * as THREE from 'three';

const N = 420;
// the end of the silencer's tail pipe, measured on the Blender model (page coordinates)
export const EXHAUST_TIP = new THREE.Vector3(-0.17, 0.172, 0.078);

function puffTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  // a soft ball made of overlapping blobs, so each puff is lumpy rather than a perfect disc
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 22;
    const x = 64 + Math.cos(a) * r;
    const y = 64 + Math.sin(a) * r;
    const rad = 26 + rnd() * 22;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,0.42)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSmoke(scene) {
  const pos = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const alpha = new Float32Array(N);
  const spin = new Float32Array(N);
  const vel = new Float32Array(N * 3);
  const age = new Float32Array(N).fill(1);
  const life = new Float32Array(N).fill(1);
  const s0 = new Float32Array(N);
  const s1 = new Float32Array(N);
  const a0 = new Float32Array(N);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spin, 1).setUsage(THREE.DynamicDrawUsage));
  geo.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {map: {value: puffTexture()}, uColor: {value: new THREE.Color('#9299a3')}},
    vertexShader: `
      attribute vec3 aPos; attribute float aSize; attribute float aAlpha; attribute float aSpin;
      varying vec2 vUv; varying float vA;
      void main() {
        float c = cos(aSpin), s = sin(aSpin);
        vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aSize;
        vec4 mv = modelViewMatrix * vec4(aPos, 1.0);
        mv.xy += q;
        gl_Position = projectionMatrix * mv;
        vUv = uv; vA = aAlpha;
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 uColor; varying vec2 vUv; varying float vA;
      void main() {
        float a = texture2D(map, vUv).a * vA;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.raycast = () => {};
  scene.add(mesh);

  let next = 0;
  let acc = 0;
  let phase = 0;
  const emit = (strength, wind) => {
    const i = next;
    next = (next + 1) % N;
    pos[i * 3] = EXHAUST_TIP.x - Math.random() * 0.01;
    pos[i * 3 + 1] = EXHAUST_TIP.y + (Math.random() - 0.5) * 0.01;
    pos[i * 3 + 2] = EXHAUST_TIP.z + (Math.random() - 0.5) * 0.01;
    const v = 0.16 + 0.5 * strength;
    vel[i * 3] = -v * (0.8 + Math.random() * 0.4) - wind;
    vel[i * 3 + 1] = 0.03 + Math.random() * 0.05;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.12 + 0.04;
    age[i] = 0;
    life[i] = 1.6 + Math.random() * 1.6 + strength * 0.8;
    s0[i] = 0.03 + Math.random() * 0.015;
    s1[i] = 0.22 + Math.random() * 0.2 + strength * 0.22;
    a0[i] = (0.38 + 0.45 * strength) * (0.7 + Math.random() * 0.6);
    spin[i] = Math.random() * 6.28;
  };

  let density = 0;
  /** dt: seconds of simulated time; rpm; load 0..1 (how open the throttle is); wind: road speed, m/s */
  const update = (dt, {rpm, load, wind = 0, on = true}) => {
    if (dt > 0 && on) {
      // the engine fires once per turn: puffs come in pulses at that rate, thicker under load
      const fire = rpm / 60;
      phase += fire * dt;
      const pulse = 0.55 + 0.45 * Math.max(0, Math.sin(phase * Math.PI * 2));
      const strength = Math.min(1, 0.15 + 0.55 * load + 0.35 * Math.max(0, (rpm - 1500) / 5500));
      acc += dt * (16 + fire * 0.55 * (0.4 + load)) * pulse;
      while (acc >= 1) {
        acc -= 1;
        emit(strength, wind);
      }
    }
    density = 0;
    for (let i = 0; i < N; i++) {
      if (age[i] >= life[i]) {
        alpha[i] = 0;
        continue;
      }
      age[i] += dt;
      const k = Math.min(1, age[i] / life[i]);
      // drag slows the jet; warm smoke rises; the road wind keeps pulling it back
      const drag = Math.exp(-dt * 1.8);
      vel[i * 3] = (vel[i * 3] + wind) * drag - wind;
      vel[i * 3 + 1] = vel[i * 3 + 1] * drag + dt * 0.16;
      vel[i * 3 + 2] *= drag;
      const sw = Math.sin(age[i] * 3 + i) * 0.03;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += (vel[i * 3 + 2] + sw) * dt;
      size[i] = s0[i] + (s1[i] - s0[i]) * Math.sqrt(k);
      alpha[i] = a0[i] * Math.min(1, age[i] / 0.08) * Math.pow(1 - k, 1.4);
      spin[i] += dt * 0.4;
      density += alpha[i];
    }
    for (const k of ['aPos', 'aSize', 'aAlpha', 'aSpin']) geo.attributes[k].needsUpdate = true;
  };
  return {mesh, update, density: () => density};
}
