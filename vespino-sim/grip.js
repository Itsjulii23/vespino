// The throttle grip: a rubber twist grip drawn in SVG. Drag it up (or roll the mouse wheel over it) to open the throttle;
// the further you twist, the more the engine revs. Let go and its spring snaps it shut, like a real one.
// createGrip(parent, {onStart, onChange}) -> {el, value(), set(k), update(rpmK)}
const NS = 'http://www.w3.org/2000/svg';
const RIBS = 14;

export function createGrip(parent, {left, top, onStart, onChange}) {
  const el = document.createElement('div');
  el.id = 'grip';
  el.title = 'Puño del acelerador: arrástralo hacia arriba';
  Object.assign(el.style, {position: 'absolute', left: `${left}px`, top: `${top}px`, width: '230px', height: '132px', borderRadius: '18px', background: 'rgba(255,255,255,.92)', boxShadow: '0 6px 20px rgba(20,44,30,.18)', cursor: 'ns-resize', pointerEvents: 'auto', touchAction: 'none', userSelect: 'none'});
  el.innerHTML = `
    <div style="position:absolute;left:14px;top:9px;font:700 10.5px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#1f7a3a">Puño del acelerador</div>
    <div data-k style="position:absolute;right:14px;top:8px;font:700 12px/1 'Segoe UI',system-ui,sans-serif;color:#15201a">0 %</div>
    <svg width="230" height="132" viewBox="0 0 230 132" style="position:absolute;left:0;top:0;pointer-events:none"></svg>
    <div style="position:absolute;left:14px;bottom:8px;font:600 11px/1 'Segoe UI',system-ui,sans-serif;color:#66726b">Arrastra hacia arriba · suelta para cerrar</div>`;
  parent.appendChild(el);
  const svg = el.querySelector('svg');
  const label = el.querySelector('[data-k]');
  const mk = (tag, attrs, to = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    to.appendChild(n);
    return n;
  };
  const defs = mk('defs', {});
  const lg = mk('linearGradient', {id: 'gripRub', x1: 0, y1: 0, x2: 0, y2: 1}, defs);
  [['0', '#4a4e52'], ['0.35', '#2a2d30'], ['0.75', '#141618'], ['1', '#2b2e31']].forEach(([o, c]) => mk('stop', {offset: o, 'stop-color': c}, lg));
  const lc = mk('linearGradient', {id: 'gripChr', x1: 0, y1: 0, x2: 0, y2: 1}, defs);
  [['0', '#f4f6f8'], ['0.45', '#9aa1a8'], ['0.55', '#d9dde1'], ['1', '#6c7279']].forEach(([o, c]) => mk('stop', {offset: o, 'stop-color': c}, lc));
  // the handlebar, the switch housing, the rubber grip with ribs and the bar end
  mk('rect', {x: 0, y: 58, width: 40, height: 18, fill: 'url(#gripChr)'});
  mk('rect', {x: 36, y: 46, width: 30, height: 42, rx: 6, fill: '#2f3337'});
  mk('rect', {x: 66, y: 50, width: 132, height: 34, rx: 13, fill: 'url(#gripRub)'});
  const ribs = mk('g', {});
  const clip = mk('clipPath', {id: 'gripClip'}, defs);
  mk('rect', {x: 70, y: 50, width: 124, height: 34, rx: 12}, clip);
  ribs.setAttribute('clip-path', 'url(#gripClip)');
  const ribEls = Array.from({length: RIBS}, () => mk('rect', {x: 72, width: 120, height: 2, rx: 1, fill: '#5a5f64', opacity: 0.8}, ribs));
  mk('rect', {x: 196, y: 54, width: 12, height: 26, rx: 4, fill: 'url(#gripChr)'});
  // a painted mark on the grip that turns with it, and a rev bar at the right
  const mark = mk('rect', {x: 120, width: 26, height: 3, rx: 1.5, fill: '#5cc57a'});
  const rev = mk('rect', {x: 218, y: 112, width: 6, height: 0, rx: 3, fill: '#f05a23'});
  mk('rect', {x: 218, y: 28, width: 6, height: 84, rx: 3, fill: 'none', stroke: '#dde5e0', 'stroke-width': 1});

  let k = 0; // throttle opening, 0..1
  let held = false;
  let y0 = 0;
  let k0 = 0;
  const draw = () => {
    const a = k * 1.4; // the grip turns up to ~80 degrees
    for (let i = 0; i < RIBS; i++) {
      // ribs run round the grip: rotating it slides them over the visible half
      const ph = (i / RIBS) * Math.PI * 2 + a;
      const y = 67 - Math.cos(ph) * 16;
      ribEls[i].setAttribute('y', y.toFixed(1));
      ribEls[i].setAttribute('opacity', Math.max(0, Math.sin(ph)).toFixed(2));
    }
    const my = 67 - Math.cos(Math.PI / 2 + a) * 16;
    mark.setAttribute('y', my.toFixed(1));
    mark.setAttribute('opacity', Math.max(0, Math.sin(Math.PI / 2 + a) + 0.2).toFixed(2));
    label.textContent = `${Math.round(k * 100)} %`;
  };
  const set = (v) => {
    k = Math.min(1, Math.max(0, v));
    draw();
    if (onChange) onChange(k, held);
  };
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    held = true;
    y0 = e.clientY;
    k0 = k;
    el.setPointerCapture(e.pointerId);
    if (onStart) onStart();
  });
  el.addEventListener('pointermove', (e) => {
    if (!held) return;
    const h = el.getBoundingClientRect().height;
    set(k0 + (y0 - e.clientY) / (h * 0.7));
  });
  const release = () => {
    if (!held) return;
    held = false;
    set(0);
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onStart) onStart();
      set(k - e.deltaY * 0.0015);
    },
    {passive: false},
  );
  draw();
  return {
    el,
    value: () => k,
    held: () => held,
    set,
    update(rpmK) {
      rev.setAttribute('height', (84 * rpmK).toFixed(1));
      rev.setAttribute('y', (112 - 84 * rpmK).toFixed(1));
    },
  };
}
