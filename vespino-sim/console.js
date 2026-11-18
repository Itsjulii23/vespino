// The Vespino's overlay, in Spanish.
// Left: the logo and two tabs. "Vistas" has the camera, cutaway and overlay buttons; "Piezas" has the take-apart slider and
// the list of every part. The throttle and playback controls stay under both tabs.
// Right: short information cards, or the detail card of the part you clicked.
// Centre: the gas legend, a hint, a hover label and the callouts. Fixed 1600 x 900 CSS layout; update(s) redraws it.
import {GROUPS, ORDER, PARTS} from './parts.js';
import {HIST, HIST_SOURCES} from './history.js';
import {MOTOR} from './motor.js';
import {ASM, AVERIAS, COLORES, MODELOS} from './learn.js';
import {D, E, RATIO_HIGH, RATIO_LOW} from './kin.js';

export const C = {ink: '#15201a', mute: '#66726b', faint: '#cbd3ce', line: '#e4eae6', acc: '#2f9d4e', accDark: '#1f7a3a', accSoft: '#e6f4ea', blue: '#3d8fe0', grey: '#5d6670', orange: '#f05a23', exh: '#8b8f95'};
export const CAMS = ['hero', 'side', 'engine', 'drive', 'cockpit', 'front'];
export const CUTS = ['solid', 'glass', 'section'];
export const OVERLAYS = ['callouts', 'charge', 'charts', 'isolate'];
export const RPM_MAX = 7000;
export const RPM_MIN = 1500;

const LABEL = {
  hero: 'General', side: 'Lateral', engine: 'Motor', drive: 'Transmisión', cockpit: 'Manillar', front: 'Frontal',
  solid: 'Sólido', glass: 'Cristal', section: 'Sección',
  callouts: 'Etiquetas', charge: 'Gases', charts: 'Información', isolate: 'Solo motor',
};
const KEY = {hero: 1, side: 2, engine: 3, drive: 4, cockpit: 5, front: 6};
const VIEW_TXT = {
  hero: ['Vista general', 'Un ciclomotor de 49 cc con motor de dos tiempos. El motor va bajo la carrocería verde, entre los pedales y la rueda trasera.'],
  side: ['Vista lateral', 'De perfil se ve que el motor, la correa y la rueda trasera quedan alineados, muy abajo, para que la moto sea estable.'],
  engine: ['El motor', 'Un solo cilindro. El pistón sube y baja, y cada vuelta del cigüeñal produce una explosión.'],
  drive: ['La transmisión', 'Dos poleas y una correa cambian de marcha solas: cuanto más gira el motor, más se cierra la polea motriz.'],
  cockpit: ['El manillar', 'El velocímetro marca la velocidad real de la rueda. El faro cromado va en el centro, sobre la horquilla.'],
  front: ['Vista frontal', 'Rueda delantera de radios con tambor de freno, y el faro redondo con su copa cromada.'],
};
const CUT_TXT = {solid: '', glass: 'Carrocería transparente: se ve el interior sin quitar nada.', section: 'Corte por la mitad: se ve el interior de la pieza.'};
// the four moments of a two-stroke turn, in plain words
const STAGES = [
  ['Explosión', 'La chispa enciende la mezcla y la explosión empuja el pistón hacia abajo. Es el único tiempo que da fuerza.'],
  ['Escape', 'El pistón baja y deja libre la salida: los gases quemados escapan por el tubo de escape.'],
  ['Entrada', 'La mezcla nueva sube desde el cárter y empuja fuera lo que queda de los gases quemados.'],
  ['Compresión', 'El pistón sube y aprieta la mezcla. Debajo, el cárter aspira mezcla nueva para el siguiente giro.'],
];
const STAGE_OF = {IGNITION: 0, POWER: 0, BLOWDOWN: 1, 'EXHAUST CLOSES': 1, SCAVENGE: 2, COMPRESSION: 3};
const CLUTCH = [
  ['Embrague abierto', 'El motor gira, pero la rueda no recibe fuerza.'],
  ['Embrague entrando', 'Las zapatas empiezan a rozar y la moto arranca.'],
  ['Embrague acoplado', 'El motor mueve la rueda a través de la correa.'],
];
const DISP = ((Math.PI / 4) * E.bore * E.bore * E.stroke) / 1000;
const fmt = (v, d = 1) => v.toFixed(d).replace('.', ',');
const GNAME = Object.fromEntries(GROUPS);

const CSS = `
#app{font-family:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.ui{position:absolute;inset:0;pointer-events:none}
.pn{position:absolute;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(247,250,248,.92));border:1px solid rgba(255,255,255,.9);border-radius:20px;box-shadow:0 12px 36px rgba(20,44,30,.16),0 1px 2px rgba(20,44,30,.1),inset 0 1px 0 #fff}
.eb{position:absolute;font-size:10.5px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;color:${C.mute};white-space:nowrap}
.eb::before{content:'';display:inline-block;width:11px;height:2px;border-radius:1px;background:${C.acc};margin-right:7px;vertical-align:middle;position:relative;top:-1px}
.tx{position:absolute;font-size:13.5px;line-height:1.45;color:#38433d}
.tb{position:absolute;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border-radius:11px;border:1px solid ${C.line};background:#fff;color:${C.ink};white-space:nowrap;box-sizing:border-box;cursor:pointer;pointer-events:auto;box-shadow:0 1px 2px rgba(20,44,30,.06);transition:background .15s,color .15s,border-color .15s,box-shadow .15s,transform .15s}
.tb:hover{border-color:#b9d9c4;box-shadow:0 3px 10px rgba(30,100,60,.16);transform:translateY(-1px)}
.tb.on{background:linear-gradient(180deg,#3cae5c,${C.acc});border-color:${C.accDark};color:#fff;box-shadow:0 3px 10px rgba(30,120,60,.34)}
.tb kbd{position:absolute;right:7px;top:50%;transform:translateY(-50%);font:600 9.5px "Segoe UI",sans-serif;color:${C.mute};background:#eef2ef;border-radius:5px;padding:1px 5px}
.tb.on kbd{background:rgba(255,255,255,.25);color:#fff}
.tb.dark{background:linear-gradient(180deg,#26342c,${C.ink});border-color:${C.ink};color:#fff}
.dv{position:absolute;height:1px;background:${C.line}}
.call{position:absolute;box-sizing:border-box;padding:6px 11px 7px;background:rgba(255,255,255,.95);border-radius:11px;box-shadow:0 5px 16px rgba(20,44,30,.22);white-space:nowrap}
.call b{display:block;font-size:13px;font-weight:700}
.call span{display:block;font-size:11.5px;color:${C.mute};margin-top:1px}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid ${C.acc};opacity:0;z-index:49}
.logo{position:absolute;height:92px;width:248px;border-radius:15px;background:radial-gradient(120% 140% at 30% 10%,#a8e093 0%,#7ec26a 45%,#4f9f46 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -12px 24px rgba(30,80,30,.3),0 6px 16px rgba(40,90,40,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.logo i{font-style:italic;font-weight:700;font-size:50px;line-height:1;font-family:"Segoe Script","Brush Script MT","Lucida Handwriting",cursive;color:#f4f6f8;text-shadow:1px 1px 0 #3f444b,-1px -1px 0 #3f444b,1px -1px 0 #3f444b,-1px 1px 0 #3f444b,0 4px 7px rgba(20,40,20,.4)}
.logo u{text-decoration:none;font-size:9.5px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,.92);margin-top:6px}
.seg{position:absolute;height:38px;border-radius:13px;background:#e9efeb;box-shadow:inset 0 1px 3px rgba(20,44,30,.12)}
.plist{position:absolute;overflow-y:auto;pointer-events:auto;padding-right:4px;box-sizing:border-box}
.plist::-webkit-scrollbar{width:6px}
.plist::-webkit-scrollbar-thumb{background:#c7d3cb;border-radius:3px}
.pg{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.mute};padding:10px 6px 4px}
.pi{display:flex;align-items:center;gap:9px;height:29px;padding:0 8px;border-radius:9px;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap}
.pi:hover{background:#eef6f0}
.pi.sel{background:${C.accSoft};font-weight:700;color:${C.accDark}}
.pi span{overflow:hidden;text-overflow:ellipsis}
.opt{display:block;margin:0 0 8px;padding:10px 12px;border-radius:11px;background:#eef2ef;font-size:13.5px;font-weight:600;cursor:pointer;pointer-events:auto;border:1.5px solid transparent;transition:background .15s}
.opt:hover{background:${C.accSoft}}
.opt.ok{background:#d9f2e0;border-color:${C.acc};color:${C.accDark}}
.opt.bad{background:#fbe3df;border-color:#e0705f;color:#a3392a}
.opt.go{background:linear-gradient(180deg,#3cae5c,${C.acc});color:#fff;text-align:center}
.sw{position:absolute;width:28px;height:28px;border-radius:50%;cursor:pointer;pointer-events:auto;box-shadow:inset 0 -3px 5px rgba(0,0,0,.18),0 2px 5px rgba(20,44,30,.25);border:2px solid #fff;box-sizing:border-box}
.sw.on{outline:2.5px solid ${C.acc};outline-offset:1px}
.pi b{flex:none;min-width:66px;font-size:11.5px;color:${C.accDark}}
.yr{margin:12px 0 0;font-size:46px;line-height:1;font-weight:700;color:${C.acc};letter-spacing:-1px}
.fl{margin:0;padding:0;list-style:none}
.fl li{position:relative;padding:3px 0 3px 16px;font-size:13.5px;color:#35403a}
.fl li:before{content:'';position:absolute;left:2px;top:11px;width:6px;height:6px;border-radius:50%;background:${C.acc}}
.src{font-size:10.5px;color:${C.mute};line-height:1.4}
.pi i{display:block;width:7px;height:7px;border-radius:50%;background:${C.faint};flex:none}
.pi.sel i{background:${C.acc}}
.pi em{margin-left:auto;font-style:normal;font-size:10px;font-weight:600;color:${C.orange}}
.tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${C.accDark};background:${C.accSoft};border-radius:8px;padding:4px 9px}
.pc h2{margin:10px 0 2px;font-size:27px;line-height:1.12;font-weight:700}
.pc .sub{margin:0 0 6px;font-size:13px;color:${C.mute};font-style:italic}
.pc h4{margin:18px 0 4px;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${C.accDark}}
.pc p{margin:0;font-size:14px;line-height:1.5;color:#35403a}
.chip{display:inline-block;margin:0 5px 6px 0;padding:5px 10px;border-radius:999px;background:#eef2ef;font-size:12px;font-weight:600;cursor:pointer;pointer-events:auto;transition:background .15s}
.chip:hover{background:${C.accSoft};color:${C.accDark}}
.tip{position:absolute;z-index:40;padding:5px 10px;border-radius:9px;background:${C.ink};color:#fff;font-size:12px;font-weight:600;white-space:nowrap;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.25);display:none}
.hint{position:absolute;left:304px;width:992px;top:848px;text-align:center;font-size:13px;font-weight:600;color:#3b463f;pointer-events:none}
.hint span{display:inline-block;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 4px 14px rgba(20,44,30,.16)}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};

export function createConsole(app) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = el(`<div class="ui"></div>`);
  app.appendChild(ui);
  const mk = (parent, h) => {
    const n = el(h);
    parent.appendChild(n);
    return n;
  };
  const add = (h) => mk(ui, h);
  const full = '<div style="position:absolute;left:0;top:0;width:1600px;height:900px;pointer-events:none"></div>';
  const wrap = (parent) => mk(parent, full);
  const btn = {};
  const api = {onPart: null, onHover: null};

  const LX = 24;
  const PX = LX + 16; // content left
  const PW = 248; // content width

  // ------------------------------------------------------------ left: logo, tabs, the two tab bodies
  add(`<div class="pn" style="left:${LX}px;top:24px;width:280px;height:852px"></div>`);
  add(`<div class="logo" style="left:${PX}px;top:40px;height:64px"><i style="font-size:36px">Vespino</i><u style="margin-top:2px">CICLOMOTOR · 2 TIEMPOS</u></div>`);
  const TABS = [['V', 'Vistas', 'v'], ['P', 'Piezas', 'p'], ['M', 'Motor', 'm'], ['H', 'Historia', 'h'], ['A', 'Averías', 'a'], ['Q', 'Quiz', 'q'], ['X', 'Modelos', 'x']];
  add(`<div class="seg" style="left:${PX}px;top:114px;width:${PW}px"></div>`);
  add(`<div class="seg" style="left:${PX}px;top:154px;width:${PW}px"></div>`);
  TABS.forEach(([k, name], i) => {
    const row = i < 4 ? 0 : 1;
    const n = row ? 3 : 4;
    const w = (PW - 6) / n;
    const col = row ? i - 4 : i;
    btn['tab' + k] = add(`<div class="tb" style="left:${PX + 3 + col * w}px;top:${117 + row * 40}px;width:${w - 2}px;height:32px;border:0;font-size:12px;padding:0">${name}</div>`);
  });
  const tv = wrap(ui);
  const tp = wrap(ui);
  tp.style.display = 'none';
  const tm = wrap(ui);
  const th = wrap(ui);
  const ta = wrap(ui);
  const tq = wrap(ui);
  const tx = wrap(ui);
  for (const w of [tm, th, ta, tq, tx]) w.style.display = 'none';
  const addV = (h) => mk(tv, h);
  const addP = (h) => mk(tp, h);

  const grid = (title, keys, y, cols, h = 32, gap = 7) => {
    addV(`<div class="eb" style="left:${PX}px;top:${y}px">${title}</div>`);
    const w = (PW - gap * (cols - 1)) / cols;
    keys.forEach((k, i) => {
      const x = PX + (i % cols) * (w + gap);
      const yy = y + 22 + Math.floor(i / cols) * (h + gap);
      btn[k] = addV(`<div class="tb" style="left:${x}px;top:${yy}px;width:${w}px;height:${h}px">${LABEL[k]}${KEY[k] ? `<kbd>${KEY[k]}</kbd>` : ''}</div>`);
    });
    return y + 22 + Math.ceil(keys.length / cols) * (h + gap);
  };
  let y = grid('Vista', CAMS, 200, 2);
  y = grid('Corte', CUTS, y + 4, 3, 32, 6);
  y = grid('Mostrar', OVERLAYS, y + 4, 2);
  // drive, sound and lights share one row of three
  const w3 = (PW - 12) / 3;
  btn.drive = addV(`<div class="tb" style="left:${PX}px;top:${y + 2}px;width:${w3}px;height:32px;font-size:12px;padding:0">Conducción</div>`);
  btn.sound = addV(`<div class="tb" style="left:${PX + w3 + 6}px;top:${y + 2}px;width:${w3}px;height:32px;font-size:12px;padding:0">Sonido</div>`);
  btn.lights = addV(`<div class="tb" style="left:${PX + 2 * (w3 + 6)}px;top:${y + 2}px;width:${w3}px;height:32px;font-size:12px;padding:0">Luces</div>`);

  // sliders: throttle and playback live under both tabs; take-apart lives in the parts tab
  const SL = {x: PX + 6, w: PW - 12};
  const slider = (title, y0, put) => {
    put(`<div class="eb" style="left:${PX}px;top:${y0}px">${title}</div>`);
    const val = put(`<div style="position:absolute;left:${PX}px;width:${PW}px;text-align:right;top:${y0 - 2}px;font-size:13px;font-weight:700"></div>`);
    put(`<div style="position:absolute;left:${SL.x}px;top:${y0 + 30}px;width:${SL.w}px;height:5px;border-radius:3px;background:#dde5e0"></div>`);
    const fill = put(`<div style="position:absolute;left:${SL.x}px;top:${y0 + 30}px;height:5px;border-radius:3px;background:linear-gradient(90deg,#5cc57a,${C.acc})"></div>`);
    const knob = put(`<div style="position:absolute;top:${y0 + 23}px;width:19px;height:19px;margin-left:-9.5px;border-radius:50%;background:#fff;border:2px solid ${C.acc};box-shadow:0 2px 6px rgba(0,0,0,.28)"></div>`);
    return {val, fill, knob, y: y0 + 32.5};
  };
  // parts tab
  const sExp = slider('Despiece', 200, addP);
  btn.explodeAll = addP(`<div class="tb" style="left:${PX}px;top:252px;width:${(PW - 7) / 2}px;height:32px">Despiece total</div>`);
  btn.assemble = addP(`<div class="tb" style="left:${PX + (PW + 7) / 2}px;top:252px;width:${(PW - 7) / 2}px;height:32px">Montar todo</div>`);
  addP(`<div class="eb" style="left:${PX}px;top:298px">Piezas · ${ORDER.length}</div>`);
  const plist = addP(`<div class="plist" style="left:${PX - 6}px;top:318px;width:${PW + 12}px;height:246px"></div>`);
  const listBtn = {};
  for (const [g, gname] of GROUPS) {
    plist.appendChild(el(`<div class="pg">${gname}</div>`));
    for (const id of ORDER.filter((k) => PARTS[k].g === g)) {
      const it = el(`<div class="pi"><i></i><span>${PARTS[id].n}</span><em></em></div>`);
      it.addEventListener('click', () => api.onPart && api.onPart(id));
      it.addEventListener('mouseenter', () => api.onHover && api.onHover(id));
      it.addEventListener('mouseleave', () => api.onHover && api.onHover(null));
      plist.appendChild(it);
      listBtn[id] = it;
    }
  }
  // engine tab: the topics of the lesson
  mk(tm, `<div class="eb" style="left:${PX}px;top:200px">Cómo funciona el motor</div>`);
  const mlist = mk(tm, `<div class="plist" style="left:${PX - 6}px;top:224px;width:${PW + 12}px;height:340px"></div>`);
  const mItems = MOTOR.map((m, i) => {
    const it = el(`<div class="pi" style="height:34px"><b style="min-width:18px">${i === 0 ? '·' : i}</b><span>${m.t}</span></div>`);
    it.addEventListener('click', () => pickEx('m', i));
    mlist.appendChild(it);
    return it;
  });
  // history tab: two timelines, the Vespino and the brand
  btn.hV = mk(th, `<div class="tb on" style="left:${PX}px;top:200px;width:${(PW - 7) / 2}px;height:32px">El Vespino</div>`);
  btn.hM = mk(th, `<div class="tb" style="left:${PX + (PW + 7) / 2}px;top:200px;width:${(PW - 7) / 2}px;height:32px">La marca</div>`);
  const hlist = mk(th, `<div class="plist" style="left:${PX - 6}px;top:244px;width:${PW + 12}px;height:320px"></div>`);
  let hSet = 'vespino';
  let hItems = [];
  const buildH = () => {
    hlist.innerHTML = '';
    hItems = HIST[hSet].map((m, i) => {
      const it = el(`<div class="pi" style="height:34px"><b>${m.y}</b><span>${m.t}</span></div>`);
      it.addEventListener('click', () => pickEx('h', i));
      hlist.appendChild(it);
      return it;
    });
  };
  buildH();
  // averías: what can go wrong
  mk(ta, `<div class="eb" style="left:${PX}px;top:200px">¿Qué le pasa a la moto?</div>`);
  const alist = mk(ta, `<div class="plist" style="left:${PX - 6}px;top:224px;width:${PW + 12}px;height:340px"></div>`);
  const aItems = AVERIAS.map((m, i) => {
    const it = el(`<div class="pi" style="height:34px"><b style="min-width:18px">${i + 1}</b><span>${m.t}</span></div>`);
    it.addEventListener('click', () => pickEx('a', i));
    alist.appendChild(it);
    return it;
  });
  // modelos: colour, accessories and the real models
  mk(tx, `<div class="eb" style="left:${PX}px;top:200px">Color de la carrocería</div>`);
  const swGap = (PW - 28) / (COLORES.length - 1);
  const swatches = COLORES.map(([name, hex], i) => {
    const s = mk(tx, `<div class="sw${i === 0 ? ' on' : ''}" title="${name}" style="left:${PX + i * swGap}px;top:224px;background:${hex}"></div>`);
    s.addEventListener('click', () => {
      swatches.forEach((o) => o.classList.toggle('on', o === s));
      if (api.onPaint) api.onPaint(hex);
    });
    return s;
  });
  mk(tx, `<div class="eb" style="left:${PX}px;top:268px">Accesorios</div>`);
  const accs = [['portabultos', 'Portabultos'], ['espejos', 'Espejos']];
  accs.forEach(([id, name], i) => {
    const b = mk(tx, `<div class="tb on" style="left:${PX + i * ((PW + 7) / 2)}px;top:292px;width:${(PW - 7) / 2}px;height:30px">${name}</div>`);
    b.addEventListener('click', () => {
      const on = !b.classList.contains('on');
      b.classList.toggle('on', on);
      if (api.onAccessory) api.onAccessory(id, on);
    });
  });
  mk(tx, `<div class="eb" style="left:${PX}px;top:338px">Modelos reales · ${MODELOS.length}</div>`);
  const xlist = mk(tx, `<div class="plist" style="left:${PX - 6}px;top:360px;width:${PW + 12}px;height:204px"></div>`);
  const xItems = MODELOS.map((m, i) => {
    const it = el(`<div class="pi" style="height:32px"><b>${m.y.slice(0, 4)}</b><span>${m.t}</span></div>`);
    it.addEventListener('click', () => pickEx('x', i));
    xlist.appendChild(it);
    return it;
  });
  // quiz: guess the part, or put the bike back together
  mk(tq, `<div class="eb" style="left:${PX}px;top:200px">Juega con la moto</div>`);
  btn.qGuess = mk(tq, `<div class="tb on" style="left:${PX}px;top:224px;width:${PW}px;height:38px;font-size:14px">Adivina la pieza</div>`);
  btn.qAsm = mk(tq, `<div class="tb" style="left:${PX}px;top:270px;width:${PW}px;height:38px;font-size:14px">Monta la moto</div>`);
  mk(tq, `<div class="tx" style="left:${PX}px;top:326px;width:${PW}px;font-size:12.5px;color:${C.mute};line-height:1.5"><b>Adivina la pieza:</b> te señalo una pieza en verde y eliges su nombre entre cuatro.<br><br><b>Monta la moto:</b> la moto empieza desmontada y tienes que ir colocando las piezas en el orden correcto, pulsándolas en la escena.</div>`);
  add(`<div class="dv" style="left:${PX}px;top:574px;width:${PW}px"></div>`);
  const sThr = slider('Acelerador', 588, add);
  const sPlay = slider('Reproducción', 650, add);
  btn.pause = add(`<div class="tb dark" style="left:${PX}px;top:714px;width:${PW}px;height:36px"></div>`);
  btn.back = add(`<div class="tb" style="left:${PX}px;top:758px;width:${(PW - 7) / 2}px;height:32px">◀ Retroceder</div>`);
  btn.fwd = add(`<div class="tb" style="left:${PX + (PW + 7) / 2}px;top:758px;width:${(PW - 7) / 2}px;height:32px">Avanzar ▶</div>`);
  add(`<div class="tx" style="left:${PX}px;top:802px;width:${PW}px;font-size:12px;color:${C.mute}">Arrastra la moto para girarla y usa la rueda del ratón para acercar. <b>Clic</b> en una pieza para ver qué es; <b>H</b> oculta los paneles.</div>`);

  // ------------------------------------------------------------ the wrappers that follow the window width
  const rt = wrap(ui);
  const ct = wrap(ui);
  const std = wrap(rt);
  const pcw = wrap(rt);
  pcw.style.display = 'none';
  const addR = (h) => mk(std, h);
  const addC = (h) => mk(ct, h);

  // centre: gas legend and a hint
  addC(`<div data-g="charge" style="position:absolute;left:304px;width:992px;top:30px;display:flex;justify-content:center;gap:22px;font-size:12.5px;font-weight:600;color:${C.ink}">
    ${[['Mezcla nueva', C.blue], ['Comprimida', C.grey], ['Combustión', C.orange], ['Gases de escape', C.exh]].map(([n, c]) => `<span style="display:flex;align-items:center;gap:7px"><i style="display:block;width:11px;height:11px;border-radius:50%;background:${c}"></i>${n}</span>`).join('')}</div>`);
  const hint = addC(`<div class="hint"><span>Pulsa cualquier pieza de la moto para ver cómo funciona</span></div>`);

  // ------------------------------------------------------------ right: information cards
  const RX = 1296;
  const RW = 280;
  const IX = RX + 20;
  const IW = RW - 40;
  addR(`<div class="pn" style="left:${RX}px;top:24px;width:${RW}px;height:196px"></div>`);
  addR(`<div class="eb" style="left:${IX}px;top:40px">Estás viendo</div>`);
  const vTitle = addR(`<div style="position:absolute;left:${IX}px;top:60px;font-size:24px;font-weight:700"></div>`);
  const vText = addR(`<div class="tx" style="left:${IX}px;top:96px;width:${IW}px"></div>`);
  const vCut = addR(`<div class="tx" style="left:${IX}px;top:178px;width:${IW}px;font-size:12px;color:${C.acc};font-weight:600"></div>`);

  addR(`<div class="pn" data-g="charts" style="left:${RX}px;top:232px;width:${RW}px;height:238px"></div>`);
  addR(`<div class="eb" data-g="charts" style="left:${IX}px;top:248px">Cómo funciona</div>`);
  const sTitle = addR(`<div data-g="charts" style="position:absolute;left:${IX}px;top:270px;font-size:23px;font-weight:700;color:${C.acc};white-space:nowrap"></div>`);
  const sText = addR(`<div class="tx" data-g="charts" style="left:${IX}px;top:308px;width:${IW}px;height:64px"></div>`);
  const sList = addR(`<div data-g="charts" style="position:absolute;left:${IX}px;top:384px;width:${IW}px"></div>`);

  addR(`<div class="pn" data-g="charts" style="left:${RX}px;top:482px;width:${RW}px;height:214px"></div>`);
  addR(`<div class="eb" data-g="charts" style="left:${IX}px;top:498px">Velocidad</div>`);
  const kmh = addR(`<div data-g="charts" style="position:absolute;left:${IX}px;top:514px;font-size:52px;font-weight:800;letter-spacing:-1.5px;line-height:1"></div>`);
  addR(`<div data-g="charts" style="position:absolute;left:${IX + 118}px;top:538px;font-size:14px;font-weight:600;color:${C.mute}">km/h</div>`);
  const rpmTxt = addR(`<div class="tx" data-g="charts" style="left:${IX}px;top:574px;width:${IW}px;font-size:13px"></div>`);
  const cTitle = addR(`<div data-g="charts" style="position:absolute;left:${IX}px;top:598px;width:${IW}px;font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:8px"></div>`);
  const cText = addR(`<div class="tx" data-g="charts" style="left:${IX}px;top:618px;width:${IW}px;font-size:12.5px;line-height:1.4;color:${C.mute}"></div>`);
  addR(`<div data-g="charts" style="position:absolute;left:${IX}px;top:664px;width:${IW}px;height:6px;border-radius:3px;background:${C.line}"></div>`);
  const gFill = addR(`<div data-g="charts" style="position:absolute;left:${IX}px;top:664px;height:6px;border-radius:3px;background:linear-gradient(90deg,#5cc57a,${C.acc})"></div>`);
  addR(`<div class="eb" data-g="charts" style="left:${IX}px;top:676px;font-size:10px;letter-spacing:1px">Marcha corta</div>`);
  addR(`<div class="eb" data-g="charts" style="right:${1600 - IX - IW}px;top:676px;font-size:10px;letter-spacing:1px">Marcha larga</div>`);

  addR(`<div class="pn" data-g="charts" style="left:${RX}px;top:708px;width:${RW}px;height:168px"></div>`);
  addR(`<div class="eb" data-g="charts" style="left:${IX}px;top:724px">Ficha técnica</div>`);
  const rows = [['Motor', '2 tiempos, 1 cilindro'], ['Cilindrada', `${fmt(DISP)} cc`], ['Transmisión', 'Variador automático'], ['Reducción final', `${D.final.toFixed(0)} : 1`]];
  addR(`<div data-g="charts" style="position:absolute;left:${IX}px;top:748px;width:${IW}px">${rows
    .map(([a, b]) => `<div style="display:flex;justify-content:space-between;height:25px;align-items:center;font-size:12.5px;border-top:1px solid ${C.line}"><span style="color:${C.mute}">${a}</span><b style="font-weight:600">${b}</b></div>`)
    .join('')}</div>`);

  // right: the detail card of the part you clicked
  mk(pcw, `<div class="pn" style="left:${RX}px;top:24px;width:${RW}px;height:852px"></div>`);
  const pc = mk(pcw, `<div class="pc" style="position:absolute;left:${IX}px;top:44px;width:${IW}px;height:686px;overflow:hidden;pointer-events:none"></div>`);
  btn.inspect = mk(pcw, `<div class="tb dark" style="left:${IX}px;top:738px;width:${IW}px;height:38px;font-size:14px">Examinar en 3D</div>`);
  btn.rm = mk(pcw, `<div class="tb on" style="left:${IX}px;top:784px;width:${IW}px;height:38px;font-size:14px">Quitar pieza</div>`);
  btn.close = mk(pcw, `<div class="tb" style="left:${IX}px;top:830px;width:${IW}px;height:32px">Volver a ver toda la moto</div>`);
  pc.addEventListener('click', (e) => {
    const c = e.target.closest('[data-part]');
    if (c && api.onPart) api.onPart(c.dataset.part);
  });

  const ew = wrap(rt);
  ew.style.display = 'none';
  mk(ew, `<div class="pn" style="left:${RX}px;top:24px;width:${RW}px;height:852px"></div>`);
  const ec = mk(ew, `<div class="pc" style="position:absolute;left:${IX}px;top:44px;width:${IW}px;height:770px;overflow:hidden;pointer-events:none"></div>`);
  btn.prev = mk(ew, `<div class="tb" style="left:${IX}px;top:830px;width:${(IW - 7) / 2}px;height:32px">◀ Anterior</div>`);
  btn.next = mk(ew, `<div class="tb on" style="left:${IX + (IW + 7) / 2}px;top:830px;width:${(IW - 7) / 2}px;height:32px">Siguiente ▶</div>`);
  const exIdx = {m: 0, h: 0, a: 0, x: 0};
  const KINDS = {
    m: {list: () => MOTOR, items: () => mItems, head: (m, i, n) => `<span class="tag">Motor · ${i + 1} de ${n}</span>`},
    h: {list: () => HIST[hSet], items: () => hItems, head: (m) => `<span class="tag">${hSet === 'vespino' ? 'Historia del Vespino' : 'La marca'}</span><div class="yr">${m.y}</div>`},
    a: {list: () => AVERIAS, items: () => aItems, head: (m, i, n) => `<span class="tag">Avería · ${i + 1} de ${n}</span>`},
    x: {list: () => MODELOS, items: () => xItems, head: (m) => `<span class="tag">Modelo</span><div class="yr" style="font-size:34px">${m.y}</div>`},
  };
  // quiz state
  const qz = {mode: null, id: null, opts: [], ans: null, score: 0, n: 0, i: 0, wrong: 0, hint: false, msg: ''};
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const renderQuiz = () => {
    let h;
    if (!qz.mode) h = `<span class="tag">Quiz</span><h2>Elige un juego</h2><p style="margin-top:12px">Adivina el nombre de las piezas o monta la moto desde cero. Se aprende tocando.</p>`;
    else if (qz.mode === 'guess') {
      const p = PARTS[qz.id];
      h = `<span class="tag">Quiz · pregunta ${qz.n} · ${qz.score} aciertos</span><h2>¿Qué pieza es?</h2><p class="sub">Mírala resaltada en verde en la moto</p><div style="margin-top:16px">${qz.opts
        .map((o, i) => `<div class="opt${qz.ans === null ? '' : o === qz.id ? ' ok' : qz.ans === i ? ' bad' : ''}" data-opt="${i}">${PARTS[o].n}</div>`)
        .join('')}</div>${qz.ans !== null ? `<h4>${qz.opts[qz.ans] === qz.id ? '¡Correcto!' : 'Era:'} ${p.n}</h4><p>${p.w}</p><div class="opt go" data-next style="margin-top:14px">Siguiente ▶</div>` : ''}`;
    } else if (qz.i >= ASM.length) h = `<span class="tag">Montaje</span><h2>¡Moto montada!</h2><p style="margin-top:12px">Has colocado las ${ASM.length} piezas con ${qz.wrong} fallos.</p><div class="opt go" data-again style="margin-top:18px">Volver a jugar</div>`;
    else {
      const p = PARTS[ASM[qz.i]];
      h = `<span class="tag">Montaje · paso ${qz.i + 1} de ${ASM.length}</span><h2>Coloca: ${p.n}</h2><p class="sub">${p.s}</p><p style="margin-top:12px">Haz clic en esa pieza dentro de la escena: está flotando fuera de la moto.</p>${qz.msg ? `<p style="margin-top:12px;color:#a3392a;font-weight:600">${qz.msg}</p>` : ''}<div style="margin-top:16px"><div class="opt" data-hint>${qz.hint ? 'Pista activada: mírala en verde' : 'Ver pista'}</div><div class="opt" data-auto>Colocarla por mí</div></div>`;
    }
    ec.innerHTML = h;
  };
  const nextGuess = () => {
    qz.id = ORDER[Math.floor(Math.random() * ORDER.length)];
    const same = ORDER.filter((k) => k !== qz.id && PARTS[k].g === PARTS[qz.id].g);
    const pool = shuffle(same).slice(0, 3);
    while (pool.length < 3) {
      const o = ORDER[Math.floor(Math.random() * ORDER.length)];
      if (o !== qz.id && !pool.includes(o)) pool.push(o);
    }
    qz.opts = shuffle([qz.id, ...pool]);
    qz.ans = null;
    qz.n++;
    if (api.onQuiz) api.onQuiz(qz.id);
    renderQuiz();
  };
  const endQuiz = () => {
    if (qz.mode === 'asm' && api.onAsm) api.onAsm('end');
    qz.mode = null;
    if (api.onQuiz) api.onQuiz(null);
  };
  const startGuess = () => {
    endQuiz();
    Object.assign(qz, {mode: 'guess', score: 0, n: 0});
    btn.qGuess.classList.add('on');
    btn.qAsm.classList.remove('on');
    nextGuess();
  };
  const startAsm = () => {
    endQuiz();
    Object.assign(qz, {mode: 'asm', i: 0, wrong: 0, hint: false, msg: ''});
    btn.qGuess.classList.remove('on');
    btn.qAsm.classList.add('on');
    if (api.onAsm) api.onAsm('start');
    if (api.onQuiz) api.onQuiz(null);
    renderQuiz();
  };
  const place = (id) => {
    if (api.onAsm) api.onAsm('place', id);
    qz.i++;
    qz.hint = false;
    qz.msg = '';
    if (api.onQuiz) api.onQuiz(null);
    renderQuiz();
  };
  api.asmPick = (id) => {
    if (qz.mode !== 'asm' || qz.i >= ASM.length) return false;
    if (id === ASM[qz.i]) place(id);
    else {
      qz.wrong++;
      qz.msg = `Esa es ${PARTS[id].n}. Busca: ${PARTS[ASM[qz.i]].n}.`;
      renderQuiz();
    }
    return true;
  };
  btn.qGuess.addEventListener('click', startGuess);
  btn.qAsm.addEventListener('click', startAsm);
  ec.addEventListener('click', (e) => {
    const t = e.target.closest('[data-opt],[data-next],[data-again],[data-hint],[data-auto]');
    if (!t) return;
    if (t.dataset.opt !== undefined && qz.ans === null) {
      qz.ans = Number(t.dataset.opt);
      if (qz.opts[qz.ans] === qz.id) qz.score++;
      renderQuiz();
    } else if (t.dataset.next !== undefined) nextGuess();
    else if (t.dataset.again !== undefined) startAsm();
    else if (t.dataset.hint !== undefined) {
      qz.hint = true;
      if (api.onQuiz) api.onQuiz(ASM[qz.i], false);
      renderQuiz();
    } else if (t.dataset.auto !== undefined) place(ASM[qz.i]);
  });
  const renderEx = () => {
    const k = tab;
    btn.prev.style.display = btn.next.style.display = k === 'q' ? 'none' : '';
    if (k === 'q') return renderQuiz();
    const K = KINDS[k];
    if (!K) return;
    const list = K.list();
    const m = list[exIdx[k]];
    const items = K.items();
    items.forEach((it, i) => it.classList.toggle('sel', i === exIdx[k]));
    const body = m.secs ? m.secs.map(([a, b]) => `<h4>${a}</h4><p>${b}</p>`).join('') + `<p class="src" style="margin-top:18px">Orientativo: ante la duda, llévala a un taller.</p>` : `<p style="margin-top:12px">${m.p}</p><h4>Datos</h4><ul class="fl">${m.f.map((f) => `<li>${f}</li>`).join('')}</ul>`;
    ec.innerHTML = `${K.head(m, exIdx[k], list.length)}<h2>${m.t}</h2>${m.s ? `<p class="sub">${m.s}</p>` : ''}${body}${k === 'h' ? `<p class="src" style="margin-top:22px">${HIST_SOURCES}</p>` : ''}${k === 'x' ? `<p class="src" style="margin-top:22px">Datos de la Wikipedia (Motovespa Vespino). Los colores son solo para probar.</p>` : ''}`;
    btn.prev.style.opacity = exIdx[k] > 0 ? '1' : '.4';
    btn.next.style.opacity = exIdx[k] < list.length - 1 ? '1' : '.4';
    if (items[exIdx[k]]) items[exIdx[k]].scrollIntoView({block: 'nearest'});
  };
  const pickEx = (k, i) => {
    exIdx[k] = i;
    renderEx();
    if (api.onTopic) api.onTopic(k, KINDS[k].list()[i]);
  };
  const stepEx = (d) => {
    const K = KINDS[tab];
    if (!K) return;
    const n = K.list().length;
    const i = Math.max(0, Math.min(n - 1, exIdx[tab] + d));
    if (i !== exIdx[tab]) pickEx(tab, i);
  };
  btn.prev.addEventListener('click', () => stepEx(-1));
  btn.next.addEventListener('click', () => stepEx(1));
  for (const [b, set] of [[btn.hV, 'vespino'], [btn.hM, 'marca']])
    b.addEventListener('click', () => {
      hSet = set;
      exIdx.h = 0;
      btn.hV.classList.toggle('on', set === 'vespino');
      btn.hM.classList.toggle('on', set === 'marca');
      buildH();
      renderEx();
    });

  // ------------------------------------------------------------ callouts, hover label, the pointer
  const callSvg = add(`<svg data-callouts style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);
  const callG = add(`<div data-callouts style="position:absolute;inset:0"></div>`);
  const tip = add(`<div class="tip"></div>`);
  const ring = add(`<div class="ring"></div>`);
  const cur = add(`<div class="cur"><svg width="22" height="22" viewBox="0 0 34 34"><path d="M4 3 L30 13.5 L17.5 17.5 L13.5 30 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`);
  const spots = {};
  const refreshSpots = () => {
    for (const [k, n] of Object.entries(btn)) spots[k] = [n.offsetLeft + n.offsetWidth / 2, n.offsetTop + n.offsetHeight / 2];
  };
  refreshSpots();
  const knobX = (v) => SL.x + v * SL.w;
  const pointer = (c) => {
    cur.style.display = c.x < 0 ? 'none' : 'block';
    cur.style.transform = `translate(${(c.x - 3).toFixed(2)}px, ${(c.y - 2).toFixed(2)}px) scale(${c.press ? 0.88 : 1})`;
    ring.style.left = `${c.ringX}px`;
    ring.style.top = `${c.ringY}px`;
    ring.style.opacity = String(c.ring * 0.85);
    ring.style.transform = `scale(${(0.35 + 0.9 * (1 - c.ring)).toFixed(3)})`;
  };
  // only touch the DOM when a value changed
  const memo = new Map();
  const put = (n, key, fn) => {
    if (memo.get(n) === key) return;
    memo.set(n, key);
    fn(n);
  };
  const setHtml = (n, h) => put(n, h, () => (n.innerHTML = h));

  let tab = 'v';
  const setTab = (t) => {
    if (tab === 'q' && t !== 'q') endQuiz();
    tab = t;
    tv.style.display = t === 'v' ? '' : 'none';
    tp.style.display = t === 'p' ? '' : 'none';
    tm.style.display = t === 'm' ? '' : 'none';
    th.style.display = t === 'h' ? '' : 'none';
    ta.style.display = t === 'a' ? '' : 'none';
    tq.style.display = t === 'q' ? '' : 'none';
    tx.style.display = t === 'x' ? '' : 'none';
    renderEx();
    for (const [b, yes] of TABS.map(([k, , id]) => [btn['tab' + k], t === id])) {
      b.style.background = yes ? '#fff' : 'transparent';
      b.style.color = yes ? C.ink : C.mute;
      b.style.boxShadow = yes ? '0 2px 6px rgba(20,44,30,.18)' : 'none';
    }
  };
  setTab('v');
  for (const [k, , id] of TABS)
    btn['tab' + k].addEventListener('click', () => {
      const was = tab;
      setTab(id);
      if (api.onTab) api.onTab(id, was);
    });
  let shownSel = null;

  Object.defineProperty(api, 'tab', {get: () => tab});
  return Object.assign(api, {
    spots,
    refreshSpots,
    speedKnob: (v) => [knobX(v), sThr.y],
    playKnob: (v) => [knobX(v), sPlay.y],
    explodeKnob: (v) => [knobX(v), sExp.y],
    tabParts: tp,
    setTab,
    listBtn,
    btn,
    root: ui,
    centre: ct,
    setWidth(W) {
      rt.style.transform = `translateX(${W - 1600}px)`;
      ct.style.transform = `translateX(${(W - 1600) / 2}px)`;
    },
    setTip(text, x, y) {
      if (!text) {
        tip.style.display = 'none';
        return;
      }
      tip.textContent = text;
      tip.style.display = 'block';
      tip.style.left = `${x + 16}px`;
      tip.style.top = `${y + 18}px`;
    },
    update(s) {
      const slow = s.cps <= 0.45;
      const stage = slow ? (STAGE_OF[s.phase] ?? 3) : -1;
      // menu
      setHtml(sThr.val, `${Math.round(s.rpm)} rpm`);
      sThr.fill.style.width = `${(s.rpmK * SL.w).toFixed(1)}px`;
      sThr.knob.style.left = `${knobX(s.rpmK).toFixed(1)}px`;
      setHtml(sPlay.val, s.playText);
      sPlay.fill.style.width = `${(s.playK * SL.w).toFixed(1)}px`;
      sPlay.knob.style.left = `${knobX(s.playK).toFixed(1)}px`;
      setHtml(sExp.val, `${Math.round(s.explode * 100)} %`);
      sExp.fill.style.width = `${(s.explode * SL.w).toFixed(1)}px`;
      sExp.knob.style.left = `${knobX(s.explode).toFixed(1)}px`;
      setHtml(btn.pause, s.paused ? '▶ &nbsp;Continuar' : '❚❚ &nbsp;Pausa');
      for (const k of CAMS) btn[k].classList.toggle('on', s.cam === k && !s.sel);
      for (const k of CUTS) btn[k].classList.toggle('on', s.cut === k);
      for (const k of OVERLAYS) btn[k].classList.toggle('on', !!s.overlays[k]);
      btn.drive.classList.toggle('on', !!s.drive);
      btn.sound.classList.toggle('on', !!s.sound);
      btn.lights.classList.toggle('on', !!s.lights);
      for (const id of ORDER) {
        const it = listBtn[id];
        it.classList.toggle('sel', s.sel === id);
        setHtml(it.lastChild, (s.outT[id] || 0) > 0.5 ? 'quitada' : '');
      }
      hint.style.display = s.sel ? 'none' : '';

      // right column: either the cards or the part card
      const ex = !s.sel && tab !== 'v' && tab !== 'p';
      std.style.display = s.sel || ex ? 'none' : '';
      pcw.style.display = s.sel ? '' : 'none';
      ew.style.display = ex ? '' : 'none';
      if (s.sel) {
        const p = PARTS[s.sel];
        const gone = (s.outT[s.sel] || 0) > 0.5;
        if (shownSel !== s.sel) {
          shownSel = s.sel;
          pc.innerHTML = `<span class="tag">${GNAME[p.g]}</span><h2>${p.n}</h2><p class="sub">${p.s}</p>
            <h4>Qué hace</h4><p>${p.w}</p>
            <h4>Cómo funciona</h4><p>${p.h}</p>
            <h4>Dato</h4><p>${p.x}</p>
            <h4>Relacionada con</h4><div>${p.rel.map((r) => `<span class="chip" data-part="${r}">${PARTS[r].n}</span>`).join('')}</div>`;
        }
        setHtml(btn.rm, gone ? 'Volver a montar' : 'Quitar pieza');
        btn.rm.classList.toggle('on', !gone);
        btn.rm.classList.toggle('dark', gone);
      } else shownSel = null;

      // what you are looking at
      const [vt, vx] = VIEW_TXT[s.cam] || VIEW_TXT.hero;
      setHtml(vTitle, vt);
      setHtml(vText, vx);
      setHtml(vCut, s.overlays.isolate ? 'Solo motor: se oculta la carrocería.' : CUT_TXT[s.cut]);

      // how it works
      setHtml(sTitle, slow ? STAGES[stage][0] : 'Ciclo de dos tiempos');
      setHtml(sText, slow ? STAGES[stage][1] : `A este ritmo el motor da unas ${Math.round(s.rpm / 60)} explosiones por segundo. Pulsa Pausa o baja la velocidad de reproducción para ver cada momento por separado.`);
      setHtml(
        sList,
        STAGES.map(([n], i) => `<div style="display:flex;align-items:center;gap:10px;height:19px;font-size:12.5px;font-weight:${i === stage ? 700 : 500};color:${i === stage ? C.ink : C.mute}"><i style="display:block;width:${i === stage ? 26 : 14}px;height:4px;border-radius:2px;background:${i === stage ? C.acc : C.faint}"></i>${i + 1}. ${n}</div>`).join(''),
      );

      // speed, clutch, gear
      const d = s.dr;
      setHtml(kmh, d.kmh < 10 ? fmt(d.kmh) : String(Math.round(d.kmh)));
      kmh.style.color = d.e > 0.5 ? C.ink : C.mute;
      setHtml(rpmTxt, `El motor gira a <b>${Math.round(s.rpm)}</b> vueltas por minuto.`);
      const ci = d.e < 0.02 ? 0 : d.e < 0.98 ? 1 : 2;
      setHtml(cTitle, `<i style="display:block;width:9px;height:9px;border-radius:50%;background:${ci === 2 ? C.acc : ci === 1 ? C.orange : C.faint}"></i>${CLUTCH[ci][0]}`);
      setHtml(cText, CLUTCH[ci][1]);
      const gk = Math.min(1, Math.max(0, (RATIO_LOW - d.ratio) / (RATIO_LOW - RATIO_HIGH)));
      gFill.style.width = `${(gk * IW).toFixed(1)}px`;

      // callouts: a label, a thin leader to its point on the machine
      let lh = '';
      let ch = '';
      for (const c of s.callouts) {
        if (c.o < 0.02 || !c.at) continue;
        const [ax, ay] = c.at;
        const [lx, ly] = c.label;
        const top = ly - 10;
        const hgt = 40;
        const ex = ax < lx ? lx : ax > lx + c.w ? lx + c.w : Math.min(Math.max(ax, lx + 14), lx + c.w - 14);
        const ey = ay < top ? top : ay > top + hgt ? top + hgt : top + hgt / 2;
        const ex2 = ay < top || ay > top + hgt ? ex : ax < lx ? lx : lx + c.w;
        lh += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${ex2.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${C.ink}" stroke-width="1.2" opacity="${(c.o * 0.8).toFixed(2)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="4" fill="#fff" stroke="${C.ink}" stroke-width="1.6" opacity="${c.o.toFixed(2)}"/>`;
        ch += `<div class="call" style="left:${lx.toFixed(1)}px;top:${top.toFixed(1)}px;width:${c.w}px;height:${hgt}px;opacity:${c.o.toFixed(2)}"><b>${c.name}</b><span>${c.sub}</span></div>`;
      }
      callSvg.innerHTML = lh;
      callG.innerHTML = ch;
      pointer(s.cursor);
    },
    pointer,
  });
}
