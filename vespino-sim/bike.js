// The Vespino, built from code in metres: x forward, y up, z to the rider's left. Rear axle at the origin, the crank axis
// under the middle of the frame. update(s) poses everything from the crank angle and the engine speed (kin.js), so the
// piston, the variator, the belt, the gears, the wheels and the speedometer needle cannot disagree.
import * as THREE from 'three';
import {PARTS} from './parts.js';
import {beltPath, chargeColor, crankcase, crownX, D, DECK, drive, E, glow, pinX, T_EX, T_TR, X_IN} from './kin.js';
import {mortadeloPart} from './mortadelo.js';

const V3 = THREE.Vector3;
const D2R = Math.PI / 180;
const mm = (v) => v * 0.001;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// the Vespino Mortadelo (1968): 1130 mm wheelbase, 2 1/4" x 18" tyres; crank and driven pulley measured on the
// factory profile photo (blender/scripts/vespino.py), the barrel leans forward and up 12°
export const AXLE = {rear: [0, 0.2855], front: [1.13, 0.2855]};
export const CRANK = [0.343, 0.287];
export const DRIVEN = [0.035, 0.29];
const CYL_TILT = 12 * D2R;
const WHEEL_K = 0.2855 / 0.2802; // the code wheel is 280 mm in radius; the Mortadelo's is 285.5
const Z_BELT = 0.092;

// ------------------------------------------------------------ materials
const std = (o) => new THREE.MeshStandardMaterial(o);
const GREEN = new THREE.MeshPhysicalMaterial({color: '#86c872', metalness: 0.42, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1.1});
const CHROME = std({color: '#eceef2', metalness: 1, roughness: 0.2, envMapIntensity: 1.0});
const ALU = std({color: '#b8bbc1', metalness: 0.85, roughness: 0.42, envMapIntensity: 0.8});
const CASE = std({color: '#aeb2b8', metalness: 0.6, roughness: 0.5, envMapIntensity: 0.7});
const STEEL = std({color: '#8b9097', metalness: 0.9, roughness: 0.4});
const DARK = std({color: '#26282c', metalness: 0.3, roughness: 0.55});
const RUBBER = std({color: '#151618', metalness: 0, roughness: 0.9});
const treadTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 9, 64);
  g.fillRect(0, 29, 64, 6);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(150, 1);
  t.anisotropy = 4;
  return t;
})();
const TYRE = std({color: '#1b1b1c', metalness: 0, roughness: 0.88, bumpMap: treadTex, bumpScale: 2.2});
const SEAT = std({color: '#17181a', metalness: 0, roughness: 0.5});
const BELT = std({color: '#2a2b2e', metalness: 0.1, roughness: 0.7, side: THREE.DoubleSide});
const RED = std({color: '#b01a24', metalness: 0.2, roughness: 0.4, emissive: '#6a0a10', emissiveIntensity: 0.5});
const GLASS = new THREE.MeshPhysicalMaterial({color: '#cfe8ff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide});
const PORTM = std({color: '#2c2f35', metalness: 0.2, roughness: 0.8});
const gasMat = () => new THREE.MeshStandardMaterial({color: '#3d8fe0', roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, emissive: '#000000', emissiveIntensity: 0.5});
// materials that become glass or hollow in the cutaway modes
const GREEN2 = GREEN.clone();
GREEN2.side = THREE.DoubleSide;
GREEN2.userData.double = true;
const CAST = std({color: "#b8bbc1", metalness: 0.85, roughness: 0.42, envMapIntensity: 0.8});
const SHELLS = [GREEN, GREEN2, CASE, CAST];

// parts modelled in Blender: placed as exported, their materials swapped for the page's own so the paint colour,
// the glass and section cutaways and the highlight keep working. Engine castings take CAST so they turn to glass.
const ENGINE_CAST = new Set(['carter', 'cilindro', 'culata']);
// trim on a shell (bolts, grilles, the script badges) turns to glass with it instead of floating in the cutaway
const SHELL_PARTS = new Set(['chasis', 'trasera', 'cubierta', 'cubierta-correa', 'carter', 'tapa-volante', 'cilindro', 'culata']);
const CHROME_S = CHROME.clone();
const DARK_S = DARK.clone();
SHELLS.push(CHROME_S, DARK_S);
const glbMat = (id, m) => {
  const sh = SHELL_PARTS.has(id);
  const map = {pintura: GREEN, pintura_interior: GREEN2, cromo: sh ? CHROME_S : CHROME, aluminio: ENGINE_CAST.has(id) ? CAST : ALU, carter: CASE, acero: sh ? CHROME_S : STEEL, goma: sh ? DARK_S : RUBBER, asiento: SEAT};
  return map[m.name] || m;
};
const glb = (id, parent) => {
  const o = mortadeloPart(id);
  o.traverse((m) => {
    if (m.isMesh) m.material = glbMat(id, m.material);
  });
  parent.add(o);
  return o;
};

// ------------------------------------------------------------ small helpers
let curPart = null; // the piece being built: every mesh made while it is set belongs to it
const P = (id) => (curPart = id);
const shadowed = (o) => {
  if (curPart) o.userData.part = curPart;
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
};
const mesh = (g, m, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => {
  const o = shadowed(new THREE.Mesh(g, m));
  o.position.set(...p);
  o.rotation.set(...r);
  o.scale.set(...s);
  return o;
};
const cylZ = (r, len, m, p = [0, 0, 0], seg = 32) => mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2), m, p);
const cylX = (r, len, m, p = [0, 0, 0], seg = 32) => mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), m, p);

// a spur gear outline: teeth count, module, face width
function gearGeo(teeth, module, width) {
  const rp = (module * teeth) / 2;
  const ro = rp + module * 0.9;
  const rr = rp - module * 1.15;
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[rr, -0.5 * step * 0.5], [ro, -0.5 * step * 0.26], [ro, 0.5 * step * 0.26], [rr, 0.5 * step * 0.5]];
    pts.forEach(([r, da], j) => {
      const x = Math.cos(a + da) * r;
      const y = Math.sin(a + da) * r;
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, rr * 0.28, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, {depth: width, bevelEnabled: false, curveSegments: 4});
  g.translate(0, 0, -width / 2);
  return g;
}

// a wheel: a ribbed tyre, a chrome rim, 36 spokes laced to the hub flanges, a drum hub. Spins about z.
function makeWheel({drum, drumLen, id}) {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  g.add(spin);
  P(`rueda-${id}-neumatico`);
  spin.add(mesh(new THREE.TorusGeometry(0.251, 0.029, 22, 96), TYRE, [0, 0, 0], [0, 0, 0], [1, 1, 0.92]));
  // tread ribs: three thin rings
  for (const z of [-0.016, 0, 0.016]) spin.add(mesh(new THREE.TorusGeometry(0.2792, 0.0017, 6, 96), DARK, [0, 0, z], [0, 0, 0], [1, 1, 1]));
  P(`rueda-${id}-llanta`);
  spin.add(mesh(new THREE.TorusGeometry(0.2135, 0.0085, 14, 96), CHROME, [0, 0, 0], [0, 0, 0], [1, 1, 1.9]));
  const N = 36;
  const spokes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0007, 0.0007, 1, 4), CHROME, N);
  const o = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const side = i % 2 ? 1 : -1;
    const A = new V3(Math.cos(a) * 0.034, Math.sin(a) * 0.034, side * 0.03);
    const b = a + (i % 4 < 2 ? 0.34 : -0.34);
    const B = new V3(Math.cos(b) * 0.212, Math.sin(b) * 0.212, 0);
    const d = B.clone().sub(A);
    o.position.copy(A).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize());
    o.scale.set(1, d.length(), 1);
    o.updateMatrix();
    spokes.setMatrixAt(i, o.matrix);
  }
  spokes.castShadow = true;
  spokes.userData.part = `rueda-${id}-llanta`;
  spin.add(spokes);
  P(`rueda-${id}-tambor`);
  spin.add(cylZ(0.03, 0.07, ALU, [0, 0, 0], 24));
  for (const z of [-0.03, 0.03]) spin.add(cylZ(0.042, 0.004, CHROME, [0, 0, z], 28));
  spin.add(cylZ(drum, drumLen, ALU, [0, 0, 0], 32));
  P(`rueda-${id}-llanta`);
  spin.add(mesh(new THREE.BoxGeometry(0.012, 0.03, 0.014), DARK, [0.17, 0.0, 0.0], [0, 0, 0.25]));
  g.spin = spin;
  P(null);
  return g;
}

function dialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f3f2ee';
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1b1c1f';
  g.fillStyle = '#1b1c1f';
  g.lineWidth = 3;
  g.font = '600 20px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let v = 0; v <= 60; v += 10) {
    const a = ((-135 + (v / 60) * 270) * Math.PI) / 180;
    const x = 128 + Math.sin(a) * 92;
    const y = 128 - Math.cos(a) * 92;
    g.fillText(String(v), x, y);
    g.beginPath();
    g.moveTo(128 + Math.sin(a) * 108, 128 - Math.cos(a) * 108);
    g.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120);
    g.stroke();
  }
  g.font = '600 15px Arial';
  g.fillText('km/h', 128, 168);
  g.fillStyle = '#1b1c1f';
  g.fillRect(96, 180, 64, 22);
  g.fillStyle = '#e8e8e8';
  g.font = '600 15px monospace';
  g.fillText('00042', 128, 192);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function buildBike() {
  const root = new THREE.Group();
  const shell = new THREE.Group(); // everything the isolate toggle hides: sheet metal, frame, fork, seat, front wheel
  const body = new THREE.Group();
  root.add(shell);
  shell.add(body);
  const front = new THREE.Group();
  shell.add(front);

  // ---------------------------------------------------------- wheels
  const rear = makeWheel({drum: 0.062, drumLen: 0.05, id: 't'});
  rear.position.set(AXLE.rear[0], AXLE.rear[1], 0);
  rear.scale.setScalar(WHEEL_K);
  root.add(rear);
  const fw = makeWheel({drum: 0.05, drumLen: 0.05, id: 'd'});
  fw.position.set(AXLE.front[0], AXLE.front[1], 0);
  fw.scale.setScalar(WHEEL_K);
  front.add(fw);

  // ---------------------------------------------------------- frame, body, sheet metal: the Mortadelo from Blender
  for (const id of ['chasis', 'trasera', 'deposito', 'cubierta', 'guardabarros-t', 'portabultos', 'sillin', 'piloto']) glb(id, body);

  // ---------------------------------------------------------- fork, headset, handlebar, lamp, horn, mirror
  for (const id of ['guardabarros-d', 'horquilla', 'claxon', 'manillar', 'espejos', 'faro']) glb(id, front);
  // the dial: the Veglia housing from Blender, a printed face and a needle driven by the road speed
  P('velocimetro');
  const dialBody = glb('velocimetro', front);
  dialBody.traverse((m) => {
    if (m.isMesh && m.material.name === 'piloto') m.visible = false; // Blender's fixed needle; the live one is below
  });
  const dialG = new THREE.Group();
  {
    const n = new V3(-0.4104, 0.9119, 0).normalize(); // the face looks up and back at the rider
    const y = new V3(1, 0, 0).addScaledVector(n, -n.x).normalize();
    dialG.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3().crossVectors(y, n), y, n));
    dialG.position.set(0.8217, 1.0255, 0);
  }
  dialG.add(new THREE.Mesh(new THREE.CircleGeometry(0.0245, 36), new THREE.MeshBasicMaterial({map: dialTexture(), polygonOffset: true, polygonOffsetFactor: -2})).translateZ(0.0003));
  const needle = new THREE.Group();
  needle.position.z = 0.0009;
  needle.scale.setScalar(0.72);
  needle.add(mesh(new THREE.BoxGeometry(0.0025, 0.026, 0.0008), new THREE.MeshBasicMaterial({color: '#d6182b'}), [0, 0.011, 0]));
  dialG.add(needle);
  dialG.traverse((o) => (o.userData.part = 'velocimetro'));
  front.add(dialG);
  P(null);

  // ---------------------------------------------------------- pedals, stand, shock, exhaust
  for (const id of ['pedales', 'amortiguador', 'caballete']) glb(id, shell);
  glb('escape', root);
  const anchors = {
    cylinder: new V3(CRANK[0] + 0.095 * Math.cos(CYL_TILT), CRANK[1] + 0.095 * Math.sin(CYL_TILT), 0),
    flywheel: new V3(CRANK[0], CRANK[1], -0.085),
    drivePulley: new V3(CRANK[0], CRANK[1], Z_BELT),
    drivenPulley: new V3(DRIVEN[0], DRIVEN[1], Z_BELT),
    finalDrive: new V3(0.02, 0.31, 0.065),
    exhaust: new V3(0.13, 0.17, 0.11),
    dial: new V3(0.822, 1.03, 0),
    crankcase: new V3(CRANK[0], CRANK[1], 0.0),
    frontWheel: new V3(AXLE.front[0], AXLE.front[1], 0.045),
    rack: new V3(0.0, 0.69, 0.1),
    lamp: new V3(0.902, 0.975, 0),
  };

  // ---------------------------------------------------------- the engine: crankcase, barrel, head, crank, rod, piston, gas
  const eng = new THREE.Group();
  eng.position.set(CRANK[0], CRANK[1], 0);
  eng.rotation.z = CYL_TILT; // the bore axis is the engine's local +x
  root.add(eng);
  const castings = new THREE.Group();
  eng.add(castings);
  // the castings come from Blender in page coordinates: a frame that undoes the engine's own placement
  const abs = new THREE.Group();
  eng.updateMatrix();
  abs.applyMatrix4(eng.matrix.clone().invert());
  castings.add(abs);
  for (const id of ['carter', 'cilindro', 'culata', 'bujia', 'tapa-volante', 'filtro', 'carburador']) glb(id, abs);
  const x0 = mm(62);
  const x1 = mm(DECK);
  // a glass liner so the piston reads through the fins; the port windows sit on it
  P('cilindro');
  const liner = cylX(mm(19.2), x1 - x0, GLASS, [(x0 + x1) / 2, 0, 0], 32);
  liner.castShadow = false;
  eng.add(liner);
  const crownTdc = mm(crownX(0));
  const win = (xa, xb, w, p, rot) => {
    const m = mesh(new THREE.BoxGeometry(Math.abs(xa - xb), 0.0012, w), PORTM, p, rot);
    m.castShadow = false;
    return m;
  };
  const portsG = new THREE.Group();
  eng.add(portsG);
  {
    const exA = crownTdc - mm(T_EX);
    const exB = crownTdc - mm(E.stroke);
    portsG.add(win(exA, exB, 0.017, [(exA + exB) / 2, -0.0194, 0], [0, 0, 0]));
    const trA = crownTdc - mm(T_TR);
    for (const s of [1, -1]) portsG.add(win(trA, exB, 0.011, [(trA + exB) / 2, 0, s * 0.0194], [Math.PI / 2, 0, 0]));
    portsG.add(win(mm(X_IN[0]), mm(X_IN[1]), 0.017, [(mm(X_IN[0]) + mm(X_IN[1])) / 2, 0.0194, 0], [0, 0, 0]));
  }
  // crank assembly
  P('ciguenal');
  const crank = new THREE.Group();
  eng.add(crank);
  for (const z of [-0.0145, 0.0145]) {
    crank.add(cylZ(0.0285, 0.008, STEEL, [0, 0, z], 36));
    const half = new THREE.Shape();
    half.absarc(0, 0, 0.0365, Math.PI / 2, (3 * Math.PI) / 2, false);
    half.closePath();
    const cw = mesh(new THREE.ExtrudeGeometry(half, {depth: 0.008, bevelEnabled: false, curveSegments: 14}), STEEL, [0, 0, z - 0.004]);
    crank.add(cw);
  }
  crank.add(cylZ(mm(5.5), 0.036, STEEL, [mm(E.r), 0, 0], 16));
  crank.add(cylZ(mm(9), 0.26, STEEL, [0, 0, 0.0], 16));
  // connecting rod + piston
  P('biela');
  const rod = new THREE.Group();
  rod.add(mesh(new THREE.BoxGeometry(mm(E.rod), 0.008, 0.011), STEEL, [0, 0, 0]));
  rod.add(cylZ(0.0085, 0.012, STEEL, [-mm(E.rod) / 2, 0, 0], 20));
  rod.add(cylZ(0.0065, 0.012, STEEL, [mm(E.rod) / 2, 0, 0], 20));
  eng.add(rod);
  P('piston');
  const piston = new THREE.Group();
  piston.add(cylX(mm(18.8), mm(34), ALU, [mm(1), 0, 0], 28));
  for (const o of [14, 11]) piston.add(cylX(mm(19.1), 0.0011, DARK, [mm(o), 0, 0], 28));
  piston.add(cylZ(0.0052, 0.034, STEEL, [0, 0, 0], 12));
  eng.add(piston);
  // the gas: above the piston, and in the crankcase and the underside of the piston
  P(null);
  const gas = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(mm(18.9), mm(18.9), 1, 28).rotateZ(Math.PI / 2), gasMat()));
  gas.castShadow = false;
  eng.add(gas);
  const ccGas = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.058, 36).rotateX(Math.PI / 2), gasMat());
  ccGas.castShadow = false;
  eng.add(ccGas);
  // flywheel magneto on the right, a cover over it
  P('volante');
  const fly = new THREE.Group();
  fly.position.z = -0.07;
  fly.add(cylZ(0.05, 0.02, DARK, [0, 0, 0], 40));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    fly.add(mesh(new THREE.BoxGeometry(0.014, 0.011, 0.012), STEEL, [Math.cos(a) * 0.038, Math.sin(a) * 0.038, -0.002], [0, 0, a]));
  }
  fly.add(mesh(new THREE.BoxGeometry(0.022, 0.006, 0.01), RED, [0.03, 0, 0.012]));
  eng.add(fly);
  P(null);

  // ---------------------------------------------------------- the variator, the belt, the gears (world frame, left side)
  const drv = new THREE.Group();
  root.add(drv);
  const pulleyHalf = (rBig, rSmall, h) => new THREE.CylinderGeometry(rBig, rSmall, h, 40).rotateX(Math.PI / 2);
  P('motriz');
  const dp = new THREE.Group(); // drive pulley (on the crank)
  dp.position.set(CRANK[0], CRANK[1], 0);
  drv.add(dp);
  const dpSpin = new THREE.Group();
  dp.add(dpSpin);
  dpSpin.add(mesh(pulleyHalf(0.016, 0.052, 0.014), STEEL, [0, 0, Z_BELT - 0.01 - 0.007]));
  const dpMove = mesh(pulleyHalf(0.052, 0.016, 0.014), STEEL);
  dpSpin.add(dpMove);
  const balls = [];
  for (let i = 0; i < 6; i++) {
    const b = mesh(new THREE.SphereGeometry(0.0055, 12, 8), CHROME);
    dpSpin.add(b);
    balls.push(b);
  }
  dpSpin.add(cylZ(0.012, 0.03, CHROME, [0, 0, 0.065], 16));
  P('conducida');
  const dn = new THREE.Group(); // driven pulley + pinion
  dn.position.set(DRIVEN[0], DRIVEN[1], 0);
  drv.add(dn);
  const dnSpin = new THREE.Group();
  dn.add(dnSpin);
  dnSpin.add(mesh(pulleyHalf(0.016, 0.052, 0.014), STEEL, [0, 0, Z_BELT + 0.01 + 0.007]));
  const dnMove = mesh(pulleyHalf(0.052, 0.016, 0.014), STEEL);
  dnSpin.add(dnMove);
  P('muelle');
  const spring = new THREE.Group();
  {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2 * 7;
      pts.push(new V3(Math.cos(a) * 0.026, Math.sin(a) * 0.026, (i / 80) * 1));
    }
    spring.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0018, 6), CHROME)));
  }
  dnSpin.add(spring);
  P('conducida');
  dnSpin.add(cylZ(0.009, 0.1, CHROME, [0, 0, 0.06], 16));
  // the centrifugal clutch: a drum with two shoes
  P('embrague');
  dnSpin.add(cylZ(0.031, 0.016, DARK, [0, 0, 0.076], 32));
  for (const sg of [1, -1]) dnSpin.add(mesh(new THREE.BoxGeometry(0.022, 0.012, 0.012), STEEL, [sg * 0.024, 0, 0.076], [0, 0, sg > 0 ? 0 : Math.PI]));
  // the gear train: 14:56 then 12:66 on the way to the rear axle
  P('engranajes');
  const P1 = new V3(DRIVEN[0], DRIVEN[1], 0);
  const P3 = new V3(AXLE.rear[0], AXLE.rear[1], 0);
  // on the Mortadelo the driven pulley sits 35 mm from the hub, so the train is drawn at a 1 mm module (the ratios,
  // which are all the motion uses, are the real ones) and the idler goes above the line where both meshes reach it
  const GM = mm(1);
  const P2 = (() => {
    const r12 = 35 * GM;
    const r23 = 39 * GM;
    const d = P1.distanceTo(P3);
    const a = (d * d + r12 * r12 - r23 * r23) / (2 * d);
    const h = Math.sqrt(Math.max(0, r12 * r12 - a * a));
    const u = P3.clone().sub(P1).normalize();
    return P1.clone().addScaledVector(u, a).addScaledVector(new V3(u.y, -u.x, 0), h);
  })();
  const gear = (n, pos, z) => {
    const g = new THREE.Group();
    g.position.set(pos.x, pos.y, z);
    g.add(mesh(gearGeo(n, GM, 0.011), STEEL));
    drv.add(g);
    return g;
  };
  const g14 = gear(14, P1, 0.058);
  const g56 = gear(56, P2, 0.058);
  const g12 = gear(12, P2, 0.072);
  const g66 = gear(66, P3, 0.072);
  g56.userData.off = Math.PI / 56;
  g66.userData.off = Math.PI / 66;
  // belt: a ribbon rebuilt every frame from the two effective radii
  P('correa');
  const NB = 160;
  const beltPos = new Float32Array(NB * 4 * 3);
  const beltGeo = new THREE.BufferGeometry();
  beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
  {
    const idx = [];
    for (let i = 0; i < NB; i++) {
      const j = (i + 1) % NB;
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        const a = i * 4 + k;
        const b = i * 4 + k2;
        const c = j * 4 + k2;
        const d = j * 4 + k;
        idx.push(a, b, c, a, c, d);
      }
    }
    beltGeo.setIndex(idx);
  }
  const beltMesh = shadowed(new THREE.Mesh(beltGeo, BELT));
  beltMesh.frustumCulled = false;
  drv.add(beltMesh);
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0035, 0.0065, 0.009), new THREE.MeshStandardMaterial({color: '#e9ebee', roughness: 0.5, emissive: '#444'}), 14);
  ticks.frustumCulled = false;
  ticks.userData.part = 'correa';
  drv.add(ticks);
  // the belt case: two bulges, a web to the hub, grilles; a ghost shell in the cutaway modes
  const caseG = new THREE.Group();
  glb('cubierta-correa', caseG);
  root.add(caseG);

  // ---------------------------------------------------------- cutaway and isolate
  const clipMats = [...SHELLS];
  const setCut = (mode) => {
    for (const m of clipMats) {
      const g = mode === 'glass';
      m.transparent = g;
      m.opacity = g ? 0.13 : 1;
      m.depthWrite = !g;
      m.side = m.userData.double || mode === 'section' ? THREE.DoubleSide : THREE.FrontSide;
      m.needsUpdate = true;
    }
    BELT.opacity = 1;
  };
  const setIsolate = (on) => {
    shell.visible = !on;
    caseG.visible = !on;
  };
  setCut('solid');

  // ---------------------------------------------------------- the pose
  const st = {lastTh: null, beltS: 0, psi: 0, gearA: 0, wheelA: 0, kmh: 0, needle: 0};
  const o = new THREE.Object3D();
  const tmp = new V3();
  const set = (n, x, y, z) => n.position.set(x, y, z);
  function poseUpdate(s) {
    const {th, rpm} = s;
    const dr = drive(rpm);
    let dth = st.lastTh === null ? 0 : th - st.lastTh;
    if (Math.abs(dth) > 180) dth = 0;
    st.lastTh = th;
    const dr_rad = dth * D2R;
    const ds = dr_rad * (dr.r1 * 0.001); // belt travel, metres
    st.beltS += ds;
    const dpsi = ds / (dr.r2 * 0.001);
    st.psi += dpsi;
    st.gearA += dpsi * dr.e;
    st.wheelA += (dpsi * dr.e) / D.final;
    s.wheelDelta = (dpsi * dr.e) / D.final;

    // piston, rod, crank
    const a = th * D2R;
    const px = mm(pinX(th));
    crank.rotation.z = -a;
    fly.rotation.z = -a;
    piston.position.set(px, 0, 0);
    const P = new V3(mm(E.r) * Math.cos(a), -mm(E.r) * Math.sin(a), 0);
    const Q = new V3(px, 0, 0);
    rod.position.copy(P).add(Q).multiplyScalar(0.5);
    rod.rotation.z = Math.atan2(Q.y - P.y, Q.x - P.x);
    // gas above the crown: colour from the cycle, glow at the burn
    const crown = mm(crownX(th));
    const deck = mm(DECK);
    gas.position.set((crown + deck) / 2, 0, 0);
    gas.scale.set(Math.max(0.0005, deck - crown), 1, 1);
    const col = chargeColor(th);
    gas.material.color.setRGB(col[0], col[1], col[2]);
    const gl = glow(th);
    gas.material.emissive.setRGB(col[0], col[1], col[2]);
    gas.material.emissiveIntensity = 0.12 + 0.55 * gl;
    gas.material.opacity = 0.5 + 0.2 * gl;
    const pcc = crankcase(th);
    ccGas.material.opacity = clamp(0.1 + 0.55 * (pcc - 0.6) / 0.85, 0.08, 0.62);
    ccGas.material.emissiveIntensity = 0.1 + 0.35 * clamp((pcc - 0.95) / 0.5, 0, 1);
    ccGas.material.color.setRGB(0.24, 0.56, 0.88);
    ccGas.material.emissive.setRGB(0.24, 0.56, 0.88);

    // variator: the drive half closes up on the belt as the weights fly out, the driven half is pushed open
    const k1 = (dr.r1 - D.r1min) / (D.r1max - D.r1min);
    dpSpin.rotation.z = -a;
    dpMove.position.z = Z_BELT + 0.0065 + 0.007 - k1 * 0.008 + 0.0 + 0.012 - 0.0;
    dpMove.position.z = Z_BELT + 0.012 - 0.0045 * k1 + 0.0035;
    balls.forEach((b, i) => {
      const ang = (i / 6) * Math.PI * 2;
      const rr = 0.014 + 0.017 * k1;
      b.position.set(Math.cos(ang) * rr, Math.sin(ang) * rr, Z_BELT - 0.03 + 0.012 * 0);
    });
    dnSpin.rotation.z = -st.psi;
    const k2 = (D.r1max - dr.r2) / (D.r1max - D.r1min);
    dnMove.position.z = Z_BELT - 0.012 + 0.0045 * k2 - 0.0035 + 0.0;
    spring.position.z = Z_BELT - 0.075;
    spring.scale.z = 0.06 - 0.012 * k2;
    // the belt ribbon
    const {pts, total} = beltPath(CRANK, dr.r1 * 0.001, DRIVEN, dr.r2 * 0.001, NB);
    const hw = 0.007;
    const th2 = 0.0038;
    for (let i = 0; i < NB; i++) {
      const [x, y, nx, ny] = pts[i];
      const verts = [
        [x, y, Z_BELT - hw],
        [x, y, Z_BELT + hw],
        [x + nx * th2, y + ny * th2, Z_BELT + hw],
        [x + nx * th2, y + ny * th2, Z_BELT - hw],
      ];
      for (let k = 0; k < 4; k++) {
        const o4 = (i * 4 + k) * 3;
        beltPos[o4] = verts[k][0];
        beltPos[o4 + 1] = verts[k][1];
        beltPos[o4 + 2] = verts[k][2];
      }
    }
    beltGeo.attributes.position.needsUpdate = true;
    beltGeo.computeVertexNormals();
    for (let i = 0; i < 14; i++) {
      const u = ((((i / 14) * total - st.beltS) % total) + total) % total;
      const f = (u / total) * NB;
      const i0 = Math.floor(f) % NB;
      const i1 = (i0 + 1) % NB;
      const t = f - Math.floor(f);
      const p0 = pts[i0];
      const p1 = pts[i1];
      const x = p0[0] + (p1[0] - p0[0]) * t;
      const y = p0[1] + (p1[1] - p0[1]) * t;
      const nx = p0[2];
      const ny = p0[3];
      o.position.set(x + nx * (th2 + 0.0015), y + ny * (th2 + 0.0015), Z_BELT);
      o.rotation.set(0, 0, Math.atan2(ny, nx) - Math.PI / 2);
      o.updateMatrix();
      ticks.setMatrixAt(i, o.matrix);
    }
    ticks.instanceMatrix.needsUpdate = true;
    // gears
    g14.rotation.z = -st.gearA;
    g56.rotation.z = st.gearA * (14 / 56) + g56.userData.off;
    g12.rotation.z = st.gearA * (14 / 56) + 0;
    g66.rotation.z = -st.gearA * (14 / 56) * (12 / 66) + g66.userData.off;
    // wheels
    rear.spin.rotation.z = -st.wheelA;
    fw.spin.rotation.z = -st.wheelA;
    // the needle: smoothed road speed against the dial's 0..60
    st.needle += (dr.kmh - st.needle) * 0.2;
    needle.rotation.z = -((-135 + (clamp(st.needle, 0, 62) / 60) * 270) * D2R);
    void tmp;
    void set;
    return dr;
  }
  // ---------------------------------------------------------- parts: take them off, highlight them, pick them
  const partMeshes = {};
  const tagged = [];
  root.updateMatrixWorld(true);
  const wp = new V3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    let id = o.userData.part;
    for (let p = o.parent; !id && p; p = p.parent) id = p.userData.part;
    if (!id) return;
    o.userData.part = id;
    o.getWorldPosition(wp);
    o.userData.sgn = wp.z >= 0 ? 1 : -1;
    o.userData.ofs = new V3();
    (partMeshes[id] ||= []).push(o);
    tagged.push(o);
  });
  const qcache = new Map();
  const wq = new THREE.Quaternion();
  const off = new V3();
  const unapply = () => {
    for (const m of tagged) {
      m.position.sub(m.userData.ofs);
      m.userData.ofs.set(0, 0, 0);
    }
  };
  const applyOffsets = (e, out) => {
    qcache.clear();
    for (const id in partMeshes) {
      const meta = PARTS[id];
      if (!meta || !meta.vec) continue;
      const k = Math.max(e * 0.7, out[id] || 0);
      if (k < 0.001) continue;
      const kk = k * k * (3 - 2 * k);
      for (const m of partMeshes[id]) {
        off.set(meta.vec[0], meta.vec[1], meta.vec[2]);
        if (meta.mirror) off.z *= m.userData.sgn;
        off.multiplyScalar(kk);
        const par = m.parent;
        let q = qcache.get(par);
        if (!q) {
          par.getWorldQuaternion(wq);
          q = wq.clone().invert();
          qcache.set(par, q);
        }
        off.applyQuaternion(q);
        m.position.add(off);
        m.userData.ofs.copy(off);
      }
    }
  };
  const update = (st2) => {
    unapply();
    const dr = poseUpdate(st2);
    applyOffsets(st2.explode || 0, st2.out || {});
    return dr;
  };

  const hoverMat = new THREE.MeshBasicMaterial({color: '#6ee59a', transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4});
  const selMat = new THREE.MeshBasicMaterial({color: '#25b85a', transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4});
  const overlayOf = (m) => {
    if (m.userData.ov) return m.userData.ov;
    let ov;
    if (m.isInstancedMesh) {
      ov = new THREE.InstancedMesh(m.geometry, hoverMat, m.count);
      ov.instanceMatrix = m.instanceMatrix;
    } else ov = new THREE.Mesh(m.geometry, hoverMat);
    ov.raycast = () => {};
    ov.frustumCulled = m.frustumCulled;
    ov.renderOrder = 3;
    m.add(ov);
    m.userData.ov = ov;
    return ov;
  };
  const hl = {hover: null, sel: null};
  const arr = (h) => (Array.isArray(h) ? h : [h]);
  const setHighlight = (hover, sel) => {
    const hs = arr(hover);
    const ids = new Set([...arr(hl.hover), hl.sel, ...hs, sel]);
    hl.hover = hover;
    hl.sel = sel;
    for (const id of ids) {
      if (!id || !partMeshes[id]) continue;
      const on = id === sel || hs.includes(id);
      for (const m of partMeshes[id]) {
        if (!on && !m.userData.ov) continue;
        const ov = overlayOf(m);
        ov.visible = on;
        ov.material = id === sel ? selMat : hoverMat;
      }
    }
  };
  // paint colour and optional accessories
  const setPaint = (hex) => {
    GREEN.color.set(hex);
    GREEN2.color.set(hex);
  };
  const setPartVisible = (id, on) => {
    for (const m of partMeshes[id] || []) m.visible = on;
  };
  const ray = new THREE.Raycaster();
  const visibleDeep = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  const pick = (ndc, camera) => {
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(tagged, false)) {
      const m = h.object.material;
      if (!visibleDeep(h.object) || (m.transparent && m.opacity < 0.5)) continue;
      return h.object.userData.part;
    }
    return null;
  };
  const box = new THREE.Box3();
  const partBox = (id) => {
    box.makeEmpty();
    for (const m of partMeshes[id] || []) {
      if (visibleDeep(m)) box.expandByObject(m, false);
    }
    return box;
  };

  return {root, update, setCut, setIsolate, anchors, partMeshes, pick, partBox, setHighlight, setPaint, setPartVisible, extraMats: [hoverMat, selMat], state: st, setCharge: (on) => ((gas.visible = on), (ccGas.visible = on)), portsG, liner, caseG, castings, eng, shell};
}
