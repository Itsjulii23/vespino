// The Vespino as a page you drive: camera views, the cutaway (solid, glass, section), the overlays, the throttle and the
// playback speed, an orbit you drag, a zoom on the wheel. Left alone it plays a scripted auto tour with the operator's
// cursor, looped; a click, drag, wheel or key hands control to the visitor, 25 s of quiet hands it back.
import {warmComposer} from 'teardown-kit/warm.js';
import {CAMS, createConsole, CUTS, OVERLAYS, RPM_MAX, RPM_MIN} from './console.js';
import {crankcase, drive, exOpen, inOpen, phaseOf, pressure, trOpen} from './kin.js';
import {ORDER, PARTS} from './parts.js';
import {createStage} from './stage.js';

let W = 1600;
const H = 900;
const IDLE = 25;
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoother = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const PLAYS = [1 / 60, 1 / 40, 1 / 20, 1 / 10, 1 / 5, 1 / 2, 1];
const playText = (p) => (p >= 1 ? 'Normal' : `1/${Math.round(1 / p)} (lento)`);

// ------------------------------------------------------------ the views: target, azimuth (0 = the bike's left side), elevation, distance
export const VIEW_FN = {
  hero: (u) => ({tx: 0.56, ty: 0.5, tz: 0, az: 38 + 3 * u, el: 14, d: 3.55, sx: -20, sy: 0}),
  side: (u) => ({tx: 0.56, ty: 0.5, tz: 0, az: 2 + 2 * u, el: 4, d: 3.4, sx: -20, sy: 0}),
  engine: (u) => ({tx: 0.56, ty: 0.3, tz: 0, az: 30 + 4 * u, el: 14, d: 1.45, sx: -30, sy: 10}),
  drive: (u) => ({tx: 0.27, ty: 0.25, tz: 0, az: 12 - 3 * u, el: 7, d: 2.0, sx: -30, sy: 20}),
  cockpit: (u) => ({tx: 1.0, ty: 0.9, tz: 0, az: -70 + 4 * u, el: 36, d: 1.75, sx: -20, sy: 0}),
  front: (u) => ({tx: 0.9, ty: 0.55, tz: 0, az: 72 - 4 * u, el: 10, d: 3.1, sx: -20, sy: 0}),
};
const KEYS = {1: 'hero', 2: 'side', 3: 'engine', 4: 'drive', 5: 'cockpit', 6: 'front'};

// the tour: one action per beat
export const SCRIPT = [
  {t: 0, cam: 'hero'},
  {t: 3.2, cam: 'engine'},
  {t: 5.8, cut: 'glass'},
  {t: 9.0, rpm: [1800, 5400, 2.2]},
  {t: 12.8, cam: 'drive'},
  {t: 15.0, iso: 1},
  {t: 19.0, iso: 0},
  {t: 19.4, cam: 'side'},
  {t: 21.6, cut: 'section'},
  {t: 24.4, cut: 'solid'},
  {t: 24.9, cam: 'cockpit'},
  {t: 28.0, cam: 'hero'},
  {t: 29.2, rpm: [5400, 1800, 1.6]},
];
export const DURATION = 32;
const last = (key, t) => SCRIPT.filter((e) => e[key] !== undefined && e.t <= t).pop();
const rpmAt = (t) => {
  let v = 1800;
  for (const e of SCRIPT) if (e.rpm && t >= e.t) v = e.rpm[0] + (e.rpm[1] - e.rpm[0]) * ss(e.t, e.t + e.rpm[2], t);
  return v;
};

function makeCursor(ui) {
  const EV = SCRIPT.filter((e) => e.t > 0).map((e) => {
    if (e.rpm) return {t: e.t, spot: ui.speedKnob((e.rpm[0] - 0) / RPM_MAX), to: ui.speedKnob(e.rpm[1] / RPM_MAX), drag: e.rpm[2], fn: (tt) => ui.speedKnob(rpmAt(tt) / RPM_MAX)};
    const k = e.cam ? e.cam : e.cut ? e.cut : 'isolate';
    return {t: e.t, spot: ui.spots[k], drag: 0};
  });
  const REST = [[820, 470], [700, 430], [900, 520], [760, 380]];
  const WP = [[0, 980, 640]];
  EV.forEach((e, i) => {
    WP.push([e.t - 0.16, ...e.spot]);
    if (e.drag) {
      for (let k = 0; k <= 12; k++) {
        const tt = e.t + (k / 12) * e.drag;
        WP.push([tt + 0.02, ...e.fn(tt)]);
      }
      WP.push([e.t + e.drag + 0.3, ...e.to]);
    } else WP.push([e.t + 0.24, ...e.spot]);
    WP.push([e.t + e.drag + 1.4, ...REST[i % REST.length]]);
  });
  WP.sort((a, b) => a[0] - b[0]);
  return (t) => {
    let i = 0;
    while (i < WP.length - 2 && t > WP[i + 1][0]) i++;
    const [t0, x0, y0] = WP[i];
    const [t1, x1, y1] = WP[i + 1];
    const lin = t1 - t0 < 0.2;
    const k = lin ? clamp((t - t0) / (t1 - t0), 0, 1) : ss(t0, t1, t);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const bow = lin ? 0 : Math.sin(Math.PI * k) * Math.min(24, len * 0.07);
    let press = false;
    let ring = 0;
    let rx = 0;
    let ry = 0;
    for (const e of EV) {
      if (t >= e.t - 0.07 && t < e.t + Math.max(0.09, e.drag + 0.1)) press = true;
      if (t >= e.t && t < e.t + 0.55) {
        ring = 1 - (t - e.t) / 0.55;
        [rx, ry] = e.spot;
      }
    }
    return {x: x0 + (x1 - x0) * k + (len ? (-(y1 - y0) / len) * bow : 0), y: y0 + (y1 - y0) * k + (len ? ((x1 - x0) / len) * bow : 0), press, ring, ringX: rx, ringY: ry};
  };
}

// callouts per view: the machine's anchor, a label and where it sits on the 1600 x 900 stage
const CALLS = {
  hero: [
    ['cylinder', 'Cilindro', 'Aquí se produce la fuerza', [640, 790], 210],
    ['drivePulley', 'Variador', 'Cambia de marcha solo', [350, 560], 210],
    ['finalDrive', 'Reducción final', 'Dos pares de engranajes', [350, 650], 210],
    ['dial', 'Velocímetro', 'Marca la velocidad real', [990, 150], 210],
    ['exhaust', 'Escape', 'Saca los gases quemados', [350, 735], 210],
  ],
  side: [
    ['cylinder', 'Cilindro', 'Motor de dos tiempos', [700, 130], 210],
    ['drivePulley', 'Variador', 'Marcha automática', [350, 140], 210],
    ['finalDrive', 'Reducción final', 'Lleva la fuerza a la rueda', [350, 225], 210],
    ['exhaust', 'Escape', 'Saca los gases quemados', [350, 735], 210],
  ],
  engine: [
    ['cylinder', 'Pistón y cilindro', 'Sube y baja sin parar', [760, 110], 210],
    ['crankcase', 'Cárter', 'Comprime la mezcla nueva', [560, 740], 210],
    ['flywheel', 'Volante magnético', 'Da la chispa a la bujía', [940, 190], 210],
  ],
  drive: [
    ['drivePulley', 'Polea motriz', 'Se cierra al subir de vueltas', [880, 100], 220],
    ['drivenPulley', 'Polea conducida', 'Un muelle la vuelve a abrir', [440, 100], 220],
    ['finalDrive', 'Reducción final', 'Dos pares de engranajes', [350, 735], 210],
  ],
  cockpit: [
    ['dial', 'Velocímetro', 'La aguja sigue a la rueda', [860, 150], 210],
    ['lamp', 'Faro', 'Copa cromada y cristal', [900, 740], 210],
  ],
  front: [
    ['lamp', 'Faro', 'Copa cromada y cristal', [700, 150], 210],
    ['frontWheel', 'Rueda delantera', 'Radios y tambor de freno', [880, 740], 210],
  ],
};

const CSS = `
html,body{background:#dfe2dd;overflow:hidden}
#app{position:absolute!important;inset:auto!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.tb{pointer-events:auto;cursor:pointer}
.tb:hover{filter:brightness(.95)}
.hit{position:absolute;pointer-events:auto;cursor:pointer}
.hit.ew{cursor:ew-resize}
.tourchip{position:absolute;left:800px;top:60px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:28px;padding:0 14px;border-radius:14px;border:1px solid #e3e8e4;background:rgba(255,255,255,.94);box-shadow:0 4px 14px rgba(20,30,24,.14);color:#16181b;font:600 12px 'Segoe UI',system-ui,sans-serif;letter-spacing:.3px;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#3c9a3f}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.turn{position:fixed;left:0;right:0;bottom:18px;text-align:center;font:600 14px/1.4 'Segoe UI',system-ui,sans-serif;color:#6b746e;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
`;

export function runLive() {
  const top = Number(document.body.dataset.top || 0);
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);
  const st = createStage({canvas});
  const ui = createConsole(app);
  const tourCursor = makeCursor(ui);

  // ------------------------------------------------------------ quality tiers
  const TIERS = [
    {samples: 4, shadow: 2048, pr: 1.5, every: 1, blur: [8, 16]},
    {samples: 2, shadow: 1024, pr: 1, every: 2, blur: [5, 10]},
    {samples: 0, shadow: 1024, pr: 0.85, every: 3, blur: [4, 8]},
    {samples: 0, shadow: 512, pr: 0.7, every: 4, blur: [3, 6]},
  ];
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  let tier = light ? 2 : 0;
  let scale = 1;
  const fit = () => {
    const h = innerHeight - top;
    W = clamp(Math.round((innerWidth / h) * H), 1280, 2600);
    scale = Math.min(innerWidth / W, h / H);
    app.style.width = `${W}px`;
    ui.setWidth(W);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${top + (h - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, TIERS[tier].pr));
  };
  const applyTier = () => {
    const {pr, ...q} = TIERS[tier];
    st.setQuality(q);
    fit();
  };
  applyTier();
  addEventListener('resize', fit);
  const toStage = (cx, cy) => {
    const r = app.getBoundingClientRect();
    return [(cx - r.left) / scale, (cy - r.top) / scale];
  };
  const tourChip = document.createElement('div');
  tourChip.className = 'tourchip';
  ui.centre.appendChild(tourChip);
  const note = document.createElement('div');
  note.className = 'turn';
  note.textContent = 'Gira el móvil en horizontal para ver todos los paneles';
  document.body.appendChild(note);

  // ------------------------------------------------------------ state
  let T = 0;
  let th = 40;
  let rpm = 1800;
  let rpmTarget = 1800;
  let playI = 2;
  let paused = false;
  let view = 'hero';
  let viewAt = 0;
  let cut = 'solid';
  let dist = 0;
  const ov = {callouts: 1, charge: 1, charts: 1, isolate: 0};
  const off = {az: 0, el: 0, k: 1};
  const cam = {...VIEW_FN.hero(0)};
  let ring = {t: -9, x: 0, y: 0};
  let hidden = false;
  let sel = null; // the part you clicked
  let hoverId = null; // the part under the pointer
  let hoverList = null; // the part under the pointer in the list
  let ptr = null; // last pointer position over the canvas
  let expT = 0; // take-apart slider, target and current
  let expK = 0;
  const out = Object.fromEntries(ORDER.map((k) => [k, 0])); // parts taken off: current and target
  const outT = Object.fromEntries(ORDER.map((k) => [k, 0]));
  let hlKey = '';
  let uiTick = 0;
  const pulse = (x, y) => (ring = {t: T, x, y});
  const pulseBtn = (k) => pulse(...ui.spots[k]);

  // ------------------------------------------------------------ the tour
  const AP = {on: true, t0: 0, loop: 0};
  let lastInput = 0;
  const startTour = () => {
    AP.on = true;
    AP.t0 = T;
    AP.loop = 0;
    paused = false;
    playI = 2;
    cut = 'solid';
    Object.assign(ov, {callouts: 1, charge: 1, charts: 1, isolate: 0});
    Object.assign(off, {az: 0, el: 0, k: 1});
    sel = null;
    expT = 0;
    for (const k of ORDER) outT[k] = 0;
    ui.setTab('v');
  };
  const takeOver = () => {
    lastInput = T;
    if (!AP.on) return;
    AP.on = false;
    const cyc = (T - AP.t0) % DURATION;
    view = last('cam', cyc).cam;
    viewAt = T - (cyc - last('cam', cyc).t);
    cut = last('cut', cyc)?.cut ?? 'solid';
    ov.isolate = last('iso', cyc)?.iso ?? 0;
  };
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else startTour();
  });
  addEventListener('pointerdown', (e) => {
    if (e.target !== tourChip) takeOver();
  });

  // ------------------------------------------------------------ controls
  const setView = (v) => {
    sel = null;
    view = v;
    viewAt = T;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  for (const k of CAMS)
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulseBtn(k);
      setView(k);
    });
  for (const k of CUTS)
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulseBtn(k);
      cut = k;
    });
  for (const k of OVERLAYS)
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulseBtn(k);
      ov[k] = ov[k] ? 0 : 1;
    });
  ui.btn.pause.addEventListener('click', () => {
    takeOver();
    pulseBtn('pause');
    paused = !paused;
  });
  for (const [k, d] of [['back', -15], ['fwd', 15]])
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulseBtn(k);
      paused = true;
      th += d;
    });
  const slider = (knobAt, apply, parent) => {
    const [x0, y] = knobAt(0);
    const [x1] = knobAt(1);
    const d = document.createElement('div');
    d.className = 'hit ew';
    Object.assign(d.style, {left: `${x0 - 8}px`, top: `${y - 11}px`, width: `${x1 - x0 + 16}px`, height: '22px'});
    const move = (e) => {
      const [x] = toStage(e.clientX, e.clientY);
      apply(clamp((x - x0) / (x1 - x0), 0, 1));
      lastInput = T;
    };
    d.addEventListener('pointerdown', (e) => {
      takeOver();
      d.setPointerCapture(e.pointerId);
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      move(e);
    });
    (parent || ui.root).appendChild(d);
  };
  slider(ui.speedKnob, (k) => (rpmTarget = clamp(k * RPM_MAX, RPM_MIN, RPM_MAX)));
  slider(ui.playKnob, (k) => (playI = Math.round(k * (PLAYS.length - 1))));
  slider(ui.explodeKnob, (k) => (expT = k), ui.tabParts);

  // ------------------------------------------------------------ parts: pick, take off, put back
  const select = (id) => {
    takeOver();
    sel = id;
    Object.assign(off, {az: 0, el: 0, k: 1});
    ui.listBtn[id].scrollIntoView({block: 'nearest'});
  };
  const deselect = () => {
    sel = null;
    Object.assign(off, {az: 0, el: 0, k: 1});
    viewAt = T;
  };
  ui.onPart = (id) => select(id);
  // the engine tab shows the motor alone through glass; the history tab shows the whole bike
  ui.onTab = (t, was) => {
    takeOver();
    if (t === 'm') {
      setView('engine');
      cut = 'glass';
      ov.isolate = 1;
    } else if (was === 'm') {
      cut = 'solid';
      ov.isolate = 0;
      setView(t === 'h' ? 'hero' : view);
    } else if (t === 'h') setView('hero');
  };
  ui.onTopic = (k, m) => {
    takeOver();
    if (k === 'm' && m.view) setView(m.view);
  };
  ui.onHover = (id) => (hoverList = id);
  ui.btn.rm.addEventListener('click', () => {
    takeOver();
    if (sel) outT[sel] = outT[sel] > 0.5 ? 0 : 1;
  });
  ui.btn.close.addEventListener('click', () => {
    takeOver();
    deselect();
  });
  ui.btn.assemble.addEventListener('click', () => {
    takeOver();
    expT = 0;
    for (const k of ORDER) outT[k] = 0;
  });
  ui.btn.explodeAll.addEventListener('click', () => {
    takeOver();
    expT = expT > 0.5 ? 0 : 1;
  });
  const pickAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return st.bike.pick({x: ((cx - r.left) / r.width) * 2 - 1, y: -(((cy - r.top) / r.height) * 2 - 1)}, st.camera);
  };
  // the camera that frames the selected part, wherever it is now
  const partTarget = () => {
    const b = st.bike.partBox(sel);
    if (b.isEmpty()) return VIEW_FN[view](0);
    const hint = PARTS[sel].cam || {az: 25, el: 14};
    const size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    return {tx: (b.min.x + b.max.x) / 2, ty: (b.min.y + b.max.y) / 2, tz: (b.min.z + b.max.z) / 2, az: hint.az, el: hint.el, d: clamp(size * 2.4 + 0.4, 0.55, 2.6), sx: 0, sy: 0};
  };
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    takeOver();
    if (key === 'escape') deselect();
    else if (KEYS[key]) setView(KEYS[key]);
    else if (key === ' ') paused = !paused;
    else if (key === 'h') hidden = !hidden;
    else if (key === 'arrowleft') {
      paused = true;
      th -= 15;
    } else if (key === 'arrowright') {
      paused = true;
      th += 15;
    } else if (key === 'arrowup') rpmTarget = clamp(rpmTarget + 300, RPM_MIN, RPM_MAX);
    else if (key === 'arrowdown') rpmTarget = clamp(rpmTarget - 300, RPM_MIN, RPM_MAX);
    else return;
    e.preventDefault();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    ptr = {x: e.clientX, y: e.clientY, dirty: true};
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 5) drag.moved = true;
    if (!drag.moved) return;
    off.az += ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -10, 60);
    drag.x = e.clientX;
    drag.y = e.clientY;
    lastInput = T;
  });
  const endDrag = (e) => {
    const click = drag && !drag.moved && e && e.type === 'pointerup';
    drag = null;
    canvas.classList.remove('drag');
    if (click) {
      const id = pickAt(e.clientX, e.clientY);
      if (id) select(id);
      else if (sel) deselect();
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    ptr = null;
    hoverId = null;
    ui.setTip(null);
    canvas.style.cursor = '';
  });
  canvas.addEventListener('dblclick', (e) => {
    const id = pickAt(e.clientX, e.clientY);
    if (id) {
      select(id);
      outT[id] = outT[id] > 0.5 ? 0 : 1;
    }
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.4, 2.2);
    },
    {passive: false},
  );

  // ------------------------------------------------------------ the frame
  startTour();
  let lastT = performance.now();
  const perf = {n: 0, sum: 0, slow: 0, age: 0};
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    T += dt;
    if (tier < TIERS.length - 1) {
      perf.age += dt;
      if (perf.age > 0.6) {
        perf.sum += dt;
        perf.n++;
        if (perf.sum >= 0.5 && perf.n >= 6) {
          perf.slow = perf.sum / perf.n > 0.032 ? perf.slow + 1 : 0;
          perf.sum = 0;
          perf.n = 0;
          if (perf.slow >= (perf.age < 6 ? 1 : 2)) {
            tier++;
            applyTier();
            Object.assign(perf, {age: 0, slow: 0});
          }
        }
      }
    }
    let tgt;
    let cursor;
    let since;
    if (AP.on) {
      const c = T - AP.t0;
      const loop = Math.floor(c / DURATION);
      const cyc = c - loop * DURATION;
      if (loop > AP.loop) AP.loop = loop;
      const ev = last('cam', cyc);
      view = ev.cam;
      since = cyc - ev.t;
      cut = last('cut', cyc)?.cut ?? 'solid';
      ov.isolate = last('iso', cyc)?.iso ?? 0;
      // a loop restarts in the opening state
      if (cyc < (SCRIPT.find((e) => e.cut)?.t ?? 99)) cut = 'solid';
      rpmTarget = rpmAt(cyc);
      tgt = VIEW_FN[view](since);
      cursor = tourCursor(cyc);
      if (AP.loop > 0 && cyc < 0.8) {
        const end = tourCursor(DURATION - 0.01);
        const k = ss(0, 0.8, cyc);
        cursor = {...cursor, x: end.x + (cursor.x - end.x) * k, y: end.y + (cursor.y - end.y) * k};
      }
    } else {
      if (T - lastInput > IDLE) startTour();
      since = T - viewAt;
      tgt = sel ? partTarget() : VIEW_FN[view](since);
      tgt.az += off.az;
      tgt.el = clamp(tgt.el + off.el, -10, 80);
      tgt.d *= off.k;
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
    }
    rpm += (rpmTarget - rpm) * (1 - Math.exp(-dt / 0.35));
    const play = PLAYS[playI];
    if (!paused) th += (rpm / 60) * 360 * dt * play;

    const k = 1 - Math.exp(-dt / (AP.on ? 0.22 : 0.45));
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd', 'sx', 'sy']) cam[key] += (tgt[key] - cam[key]) * k;

    if (ptr && ptr.dirty && !drag) {
      ptr.dirty = false;
      hoverId = pickAt(ptr.x, ptr.y);
      const [sx, sy] = toStage(ptr.x, ptr.y);
      ui.setTip(hoverId ? PARTS[hoverId].n : null, sx, sy);
      canvas.style.cursor = hoverId ? 'pointer' : '';
    }
    const hv = hoverList || hoverId;
    const key = `${hv}|${sel}`;
    if (key !== hlKey) {
      hlKey = key;
      st.bike.setHighlight(hv, sel);
    }
    const kk = 1 - Math.exp(-dt / 0.2);
    expK += (expT - expK) * kk;
    for (const id of ORDER) out[id] += (outT[id] - out[id]) * kk;
    const inside = sel && (PARTS[sel].g === 'motor' || PARTS[sel].g === 'transmision') && sel !== 'cubierta-correa' && sel !== 'tapa-volante';
    st.setCut(inside && cut === 'solid' ? 'glass' : cut);
    st.bike.setIsolate(!!ov.isolate);
    st.bike.setCharge(!!ov.charge);
    const dr = st.bike.update({th, rpm, explode: expK, out});
    // the road rolls by at the wheel's own speed
    dist += dr.kmh / 3.6 * dt * (paused ? 0 : play);
    st.road(dist);
    st.frame({...cam, az: cam.az * D2R, el: cam.el * D2R});

    // callouts
    const vis = ss(1.1, 1.8, since) * (ov.callouts ? 1 : 0) * (sel || expK > 0.04 ? 0 : 1);
    const callouts = [];
    for (const [key, name, sub, label, w] of CALLS[view] || []) {
      const at = st.project(st.bike.anchors[key]);
      if (at) callouts.push({name, sub, at, label: [label[0] + (W - 1600) / 2, label[1]], w, o: vis});
    }
    ui.root.style.display = hidden ? 'none' : '';
    for (const n of ui.root.querySelectorAll('[data-g="charge"]')) n.style.visibility = ov.charge ? '' : 'hidden';
    for (const n of ui.root.querySelectorAll('[data-g="charts"]')) n.style.visibility = ov.charts ? '' : 'hidden';
    const uiState = {
      th,
      rpm,
      rpmK: clamp(rpm / RPM_MAX, 0, 1),
      dr,
      playText: playText(play),
      playK: playI / (PLAYS.length - 1),
      paused,
      sel,
      outT,
      explode: expK,
      cps: paused ? 0 : (rpm / 60) * play,
      cam: view,
      cut,
      overlays: {...ov},
      phase: phaseOf(th),
      p: pressure(th),
      pcc: crankcase(th),
      ports: {ex: exOpen(th), tr: trOpen(th), inl: inOpen(th)},
      callouts,
      cursor,
    };
    // on a slower machine the panels redraw every other frame; the pointer always moves
    if (tier === 0 || (uiTick++ & 1) === 0) ui.update(uiState);
    else ui.pointer(cursor);
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>Recorrido automático · haz clic para tomar el control' : '▶ Reanudar recorrido';
    }
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };
  // every shader compiles at once off the main thread before the first frame
  warmComposer(st.renderer, st.composer, st.scene, st.camera).then(() => requestAnimationFrame(frame));
  window.LIVE = {st, cam, startTour, takeOver, setView, get tier() {
    return tier;
  }, get T() {
    return T;
  }, set: (o) => {
    takeOver();
    if (o.view) setView(o.view);
    if (o.cut) cut = o.cut;
    if (o.rpm) rpmTarget = o.rpm;
    if (o.th !== undefined) th = o.th;
    if (o.pause !== undefined) paused = o.pause;
    if (o.iso !== undefined) ov.isolate = o.iso;
    if (o.play !== undefined) playI = o.play;
    if (o.sel !== undefined) {
      sel = o.sel;
      Object.assign(off, {az: 0, el: 0, k: 1});
    }
    if (o.explode !== undefined) expT = o.explode;
    if (o.out) for (const k of o.out) outT[k] = 1;
    if (o.tab) ui.setTab(o.tab);
  }};
  void drive;
}
