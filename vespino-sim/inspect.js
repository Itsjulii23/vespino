// The part viewer: one part alone on a soft backdrop, turned freely in any direction. Dragging rolls the part like a ball
// under the hand (left-right turns it about the screen's vertical axis, up-down about the horizontal one, so any
// orientation can be reached); the wheel zooms; it can spin by itself. It draws with the stage's own renderer and
// lighting environment, into the same canvas, while it is open.
import * as THREE from 'three';

const CSS = `
.insp{position:fixed;inset:0;z-index:20;display:none;font-family:'Segoe UI',system-ui,sans-serif;color:#15201a}
.insp.on{display:block}
.insp .hit{position:absolute;inset:0;cursor:grab;touch-action:none}
.insp .hit.drag{cursor:grabbing}
.insp .top{position:absolute;left:50%;top:22px;transform:translateX(-50%);text-align:center;pointer-events:none}
.insp .top b{display:block;font-size:26px;font-weight:700}
.insp .top i{display:block;margin-top:4px;font-size:14px;font-style:normal;color:#66726b}
.insp .bar{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;gap:8px;padding:8px;border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 6px 22px rgba(20,44,30,.2)}
.insp .bar div{padding:9px 16px;border-radius:999px;font-size:13.5px;font-weight:600;cursor:pointer;background:#eef2ef;white-space:nowrap}
.insp .bar div:hover{background:#e6f4ea;color:#1f7a3a}
.insp .bar div.on{background:#2f9d4e;color:#fff}
.insp .bar div.dark{background:#15201a;color:#fff}
.insp .help{position:absolute;left:50%;bottom:84px;transform:translateX(-50%);font-size:12.5px;font-weight:600;color:#4c5751;pointer-events:none;white-space:nowrap}
`;

export function createInspector(renderer, envMap) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ov = document.createElement('div');
  ov.className = 'insp';
  ov.innerHTML = `<div class="hit" id="inspect-canvas-hit"></div>
    <div class="top"><b></b><i></i></div>
    <div class="help">Arrastra para girar la pieza en cualquier dirección · rueda para acercar · Esc para salir</div>
    <div class="bar"><div data-a="spin">Girar sola</div><div data-a="front">De frente</div><div data-a="side">De lado</div><div data-a="topv">Desde arriba</div><div data-a="reset">Restablecer</div><div data-a="close" class="dark">Volver a la moto</div></div>`;
  document.body.appendChild(ov);
  const hit = ov.querySelector('.hit');
  const title = ov.querySelector('.top b');
  const sub = ov.querySelector('.top i');
  const btn = Object.fromEntries([...ov.querySelectorAll('[data-a]')].map((n) => [n.dataset.a, n]));

  const scene = new THREE.Scene();
  {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#f3f5f4');
    gr.addColorStop(0.6, '#e4e9e6');
    gr.addColorStop(1, '#c9d0cc');
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
  }
  scene.environment = envMap;
  const key = new THREE.DirectionalLight('#fff4e6', 2.2);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight('#dce9ff', 1.2);
  rim.position.set(-3, 1, -2);
  scene.add(key, rim, new THREE.HemisphereLight('#f2f6fa', '#9a9d98', 0.6));
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.01, 50);
  const pivot = new THREE.Group(); // the part's rotation
  scene.add(pivot);
  let holder = null; // the cloned meshes, centred and scaled to fit

  const START = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32, -0.6, 0, 'XYZ'));
  const target = new THREE.Quaternion();
  let dist = 3.2;
  let distT = 3.2;
  let spin = false;
  let open = false;
  let id = null;
  let meshes = 0;
  const mats = [];

  const cloneMat = (m) => {
    const c = m.clone();
    if (!m.userData.keep) {
      c.transparent = false;
      c.opacity = 1;
      c.depthWrite = true;
    }
    c.clippingPlanes = null;
    c.side = THREE.DoubleSide;
    mats.push(c);
    return c;
  };
  const build = (srcMeshes) => {
    if (holder) {
      pivot.remove(holder);
      for (const m of mats) m.dispose();
      mats.length = 0;
    }
    holder = new THREE.Group();
    const inner = new THREE.Group();
    holder.add(inner);
    meshes = 0;
    for (const src of srcMeshes) {
      if (!src.visible) continue;
      src.updateWorldMatrix(true, false);
      const mat = Array.isArray(src.material) ? src.material.map(cloneMat) : cloneMat(src.material);
      let m;
      if (src.isInstancedMesh) {
        m = new THREE.InstancedMesh(src.geometry, mat, src.count);
        m.instanceMatrix.copy(src.instanceMatrix);
      } else m = new THREE.Mesh(src.geometry, mat);
      m.matrixAutoUpdate = false;
      m.matrix.copy(src.matrixWorld);
      m.frustumCulled = false;
      inner.add(m);
      meshes++;
    }
    inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    inner.position.copy(c).multiplyScalar(-1);
    holder.scale.setScalar(1.6 / size);
    pivot.add(holder);
  };

  const show = (partId, srcMeshes, meta) => {
    id = partId;
    build(srcMeshes);
    title.textContent = meta?.n || partId;
    sub.textContent = meta?.s || '';
    pivot.quaternion.copy(START);
    target.copy(START);
    dist = distT = 3.2;
    open = true;
    ov.classList.add('on');
  };
  const close = () => {
    open = false;
    ov.classList.remove('on');
    hit.classList.remove('drag');
  };

  // rolling under the hand: rotate about axes fixed to the screen, so a drag always turns the part the way it moves
  const qx = new THREE.Quaternion();
  const ax = new THREE.Vector3();
  const roll = (dx, dy) => {
    const a = Math.hypot(dx, dy);
    if (a < 1e-6) return;
    ax.set(dy, dx, 0).normalize();
    qx.setFromAxisAngle(ax, a * 0.009);
    target.premultiply(qx);
    pivot.quaternion.premultiply(qx); // the drag follows the hand at once
  };
  let drag = null;
  hit.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY};
    spin = false;
    btn.spin.classList.remove('on');
    hit.setPointerCapture(e.pointerId);
    hit.classList.add('drag');
  });
  hit.addEventListener('pointermove', (e) => {
    if (!drag) return;
    roll(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  const end = () => {
    drag = null;
    hit.classList.remove('drag');
  };
  hit.addEventListener('pointerup', end);
  hit.addEventListener('pointercancel', end);
  hit.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      distT = Math.min(8, Math.max(1.1, distT * Math.exp(e.deltaY * 0.0012)));
    },
    {passive: false},
  );
  const preset = (x, y) => target.setFromEuler(new THREE.Euler(x, y, 0, 'XYZ'));
  btn.spin.addEventListener('click', () => {
    spin = !spin;
    btn.spin.classList.toggle('on', spin);
  });
  btn.front.addEventListener('click', () => preset(0, -Math.PI / 2));
  btn.side.addEventListener('click', () => preset(0, 0));
  btn.topv.addEventListener('click', () => preset(Math.PI / 2, 0));
  btn.reset.addEventListener('click', () => {
    target.copy(START);
    distT = 3.2;
  });
  let onClose = null;
  btn.close.addEventListener('click', () => {
    close();
    if (onClose) onClose();
  });

  const spinQ = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const render = (dt, w, h) => {
    if (spin) {
      spinQ.setFromAxisAngle(Y, dt * 0.6);
      target.premultiply(spinQ);
      pivot.quaternion.premultiply(spinQ);
    }
    pivot.quaternion.slerp(target, 1 - Math.exp(-dt / 0.12));
    dist += (distT - dist) * (1 - Math.exp(-dt / 0.12));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  };
  return {
    show,
    close,
    render,
    set onClose(f) {
      onClose = f;
    },
    get isOpen() {
      return open;
    },
    get id() {
      return open ? id : null;
    },
    meshCount: () => meshes,
    quat: () => pivot.quaternion.toArray(),
  };
}
