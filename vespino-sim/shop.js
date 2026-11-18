// The shop the bike stands in, built from code (no photos, no shop signs): a light porcelain floor in 60 cm tiles, a
// blue-grey wall with black framed reliefs, a patch of patterned hydraulic tiles, a short stair with a steel handrail
// and a black bin. Everything sits behind the bike (z < 0) so the default views look across the bike at the wall.
import * as THREE from 'three';

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const canvasTex = (S, draw, repeat = [1, 1], color = true) => {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  draw(c.getContext('2d'), S);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
};

// two by two porcelain tiles per texture: a warm off-white with faint veining and thin grey joints
function porcelain(g, S) {
  const h = S / 2;
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * h;
    const y = Math.floor(i / 2) * h;
    const v = 204 + rnd() * 8;
    g.fillStyle = `rgb(${v},${v - 3},${v - 9})`;
    g.fillRect(x, y, h, h);
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = `rgba(150,146,140,${0.04 + rnd() * 0.06})`;
      g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath();
      let px = x + rnd() * h;
      let py = y + rnd() * h;
      g.moveTo(px, py);
      for (let s = 0; s < 8; s++) {
        px += (rnd() - 0.3) * 60;
        py += (rnd() - 0.5) * 40;
        g.lineTo(Math.min(x + h, Math.max(x, px)), Math.min(y + h, Math.max(y, py)));
      }
      g.stroke();
    }
    for (let k = 0; k < 1800; k++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '120,118,112' : '255,255,255'},${0.05 + rnd() * 0.08})`;
      g.fillRect(x + rnd() * h, y + rnd() * h, 1.2, 1.2);
    }
  }
  g.fillStyle = '#8f8c86';
  for (const p of [0, h]) {
    g.fillRect(p - 1.5, 0, 3, S);
    g.fillRect(0, p - 1.5, S, 3);
  }
  g.fillRect(S - 1.5, 0, 1.5, S);
  g.fillRect(0, S - 1.5, S, 1.5);
}

// hydraulic tiles, 20 cm: a four-petal rosette in charcoal, grey and cream, which joins into circles across tiles
function hydraulic(g, S) {
  const n = 4;
  const t = S / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = i * t;
      const y = j * t;
      g.fillStyle = '#e7e1d3';
      g.fillRect(x, y, t, t);
      g.fillStyle = '#3a3c3e';
      for (const [cx, cy] of [[x, y], [x + t, y], [x, y + t], [x + t, y + t]]) {
        g.beginPath();
        g.arc(cx, cy, t * 0.36, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#e7e1d3';
      for (const [cx, cy] of [[x, y], [x + t, y], [x, y + t], [x + t, y + t]]) {
        g.beginPath();
        g.arc(cx, cy, t * 0.2, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#8d9196';
      g.save();
      g.translate(x + t / 2, y + t / 2);
      for (let k = 0; k < 4; k++) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.ellipse(0, -t * 0.17, t * 0.07, t * 0.15, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#3a3c3e';
      g.beginPath();
      g.arc(0, 0, t * 0.06, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.strokeStyle = 'rgba(80,78,72,.55)';
      g.lineWidth = 2;
      g.strokeRect(x + 1, y + 1, t - 2, t - 2);
    }
  for (let k = 0; k < 6000; k++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rnd() * 0.05})`;
    g.fillRect(rnd() * S, rnd() * S, 1.5, 1.5);
  }
}

// a relief in a black frame: overlapping squares and circles in shades of grey, like the pieces on the shop's wall
function relief(g, S, kind) {
  g.fillStyle = '#16181a';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#2a2d30';
  g.fillRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84);
  const shades = ['#3c4044', '#55595e', '#24272a', '#6a6f74'];
  for (let i = 0; i < 9; i++) {
    g.fillStyle = shades[i % shades.length];
    const x = S * (0.14 + rnd() * 0.55);
    const y = S * (0.14 + rnd() * 0.55);
    const w = S * (0.12 + rnd() * 0.18);
    if (kind === 0 || (kind === 2 && i % 2)) g.fillRect(x, y, w, w);
    else {
      g.beginPath();
      g.arc(x + w / 2, y + w / 2, w / 2, 0, Math.PI * 2);
      g.fill();
    }
  }
}

export function createShop() {
  const shop = new THREE.Group();
  shop.name = 'tienda';
  const add = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.receiveShadow = shadow;
    m.castShadow = shadow;
    m.raycast = () => {};
    shop.add(m);
    return m;
  };

  // floor: 1.2 m per texture repeat (two 60 cm tiles)
  const fTex = canvasTex(1024, porcelain, [12, 9]);
  const floorMat = new THREE.MeshStandardMaterial({map: fTex, roughness: 0.32, metalness: 0});
  const floor = add(new THREE.PlaneGeometry(14.4, 10.8), floorMat, 0.6, -0.002, 2.6, false);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  // hydraulic tile patch between the bike and the stair: 80 cm per repeat
  const hTex = canvasTex(512, hydraulic, [2.5, 1.75]);
  const patch = add(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshStandardMaterial({map: hTex, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2}), 2.75, 0, -1.45, false);
  patch.rotation.x = -Math.PI / 2;
  patch.receiveShadow = true;

  // back wall and a side wall behind the rear wheel, with a dark skirting
  const WZ = -2.2;
  const wallMat = new THREE.MeshStandardMaterial({color: '#8b98a2', roughness: 0.92});
  add(new THREE.BoxGeometry(14, 3.2, 0.12), wallMat, 0.6, 1.6, WZ - 0.06, false).receiveShadow = true;
  add(new THREE.BoxGeometry(0.12, 3.2, 8), wallMat, -3.4, 1.6, 1.8, false).receiveShadow = true;
  const skirt = new THREE.MeshStandardMaterial({color: '#2b2f33', roughness: 0.6});
  add(new THREE.BoxGeometry(14, 0.08, 0.02), skirt, 0.6, 0.04, WZ + 0.01, false);
  add(new THREE.BoxGeometry(0.02, 0.08, 8), skirt, -3.33, 0.04, 1.8, false);

  // framed reliefs on the back wall
  const frameMat = new THREE.MeshStandardMaterial({color: '#0e0f10', roughness: 0.4, metalness: 0.2});
  [[-1.55, 1.35, 0.8, 0], [-0.4, 1.2, 0.6, 1], [0.7, 1.4, 0.8, 2], [1.75, 1.25, 0.55, 1]].forEach(([x, y, s, kind]) => {
    add(new THREE.BoxGeometry(s + 0.06, s + 0.06, 0.05), frameMat, x, y, WZ + 0.025, false);
    const tex = canvasTex(256, (g, S) => relief(g, S, kind));
    const art = add(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({map: tex, roughness: 0.75}), x, y, WZ + 0.052, false);
    art.receiveShadow = false;
  });

  // stair along the back wall: eight steps rising to the right, open side toward the bike, steel handrail
  const stepMat = new THREE.MeshStandardMaterial({color: '#d9d6cf', roughness: 0.45});
  const noseMat = new THREE.MeshStandardMaterial({color: '#7b7f83', roughness: 0.35, metalness: 0.6});
  const S0 = 3.9;
  const RUN = 0.28;
  const RISE = 0.18;
  const SD = 1.0; // stair width, from the wall
  for (let i = 0; i < 8; i++) {
    const h = (i + 1) * RISE;
    add(new THREE.BoxGeometry(RUN, h, SD), stepMat, S0 + i * RUN + RUN / 2, h / 2, WZ + SD / 2);
    add(new THREE.BoxGeometry(0.03, 0.012, SD), noseMat, S0 + i * RUN + 0.015, h + 0.006, WZ + SD / 2, false);
  }
  const steel = new THREE.MeshStandardMaterial({color: '#c9ccd0', roughness: 0.22, metalness: 1});
  const railZ = WZ + SD - 0.05;
  const postH = 0.9;
  const ptop = [];
  for (let i = 0; i < 8; i += 2) {
    const x = S0 + i * RUN + RUN / 2;
    const base = (i + 1) * RISE;
    add(new THREE.CylinderGeometry(0.02, 0.02, postH, 12), steel, x, base + postH / 2, railZ);
    ptop.push(new THREE.Vector3(x, base + postH, railZ));
  }
  const first = ptop[0].clone().add(new THREE.Vector3(-0.35, -0.35 * (RISE / RUN), 0));
  const last = ptop[ptop.length - 1].clone().add(new THREE.Vector3(0.35, 0.35 * (RISE / RUN), 0));
  for (const dy of [0, -0.45]) {
    const a = first.clone().add(new THREE.Vector3(0, dy, 0));
    const b = last.clone().add(new THREE.Vector3(0, dy, 0));
    const tube = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 8, dy ? 0.012 : 0.022, 12);
    add(tube, steel, 0, 0, 0);
  }
  // the newel at the foot of the stair
  add(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 12), steel, S0 - 0.3, 0.5, railZ);

  // black bin with a swing lid, at the foot of the stair
  const binMat = new THREE.MeshStandardMaterial({color: '#141516', roughness: 0.45, metalness: 0.3});
  add(new THREE.CylinderGeometry(0.17, 0.15, 0.62, 32, 1, true), binMat, 3.35, 0.31, -0.95).material.side = THREE.DoubleSide;
  add(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 32), binMat, 3.35, 0.65, -0.95);
  add(new THREE.SphereGeometry(0.18, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), binMat, 3.35, 0.68, -0.95);
  add(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 32), binMat, 3.35, 0.005, -0.95);
  return shop;
}
