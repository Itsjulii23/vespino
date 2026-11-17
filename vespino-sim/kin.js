// Vespino kinematics: a 49.8 cc two-stroke single (piston ported), the centrifugal variator and the fixed final drive.
// One input drives everything: the crank angle th (0 = firing TDC, degrees) and the engine speed rpm. Lengths in mm.
// NOTE: bore, stroke, rod and the port timing are modelled from the Piaggio 50 family (38.4 x 43); the variator radii,
// the 22:1 final drive and the wheel size are estimates fitted to the photos, not factory figures.
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smoother = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const lerp = (a, b, k) => a + (b - a) * k;
export const mod = (a, m) => ((a % m) + m) % m;
export const wrap180 = (a) => mod(a + 180, 360) - 180;

// ------------------------------------------------------------ the engine
export const E = {bore: 38.4, stroke: 43, r: 21.5, rod: 80, pinToCrown: 18, hc: 6.1};
E.A = (Math.PI / 4) * E.bore * E.bore; // mm²
export const DISP_CC = (E.A * E.stroke) / 1000;
export const S_TDC = E.r + E.rod;
/** piston pin distance from the crank axis (mm), the exact slider-crank */
export const pinX = (th) => {
  const a = th * D2R;
  return E.r * Math.cos(a) + Math.sqrt(E.rod * E.rod - (E.r * Math.sin(a)) ** 2);
};
/** how far the piston is below TDC (mm): 0 at TDC, 43 at BDC */
export const travel = (th) => S_TDC - pinX(th);
export const crownX = (th) => pinX(th) + E.pinToCrown;
/** the volume above the crown in cc */
export const volume = (th) => (E.A * (travel(th) + E.hc)) / 1000;
export const CR_GEOM = (DISP_CC + volume(0)) / volume(0);

// port timing in degrees after firing TDC; the port edges come from the same slider-crank
export const PORT = {ex: [100, 260], tr: [120, 240], inl: [-65, 65]};
export const T_EX = travel(PORT.ex[0]);
export const T_TR = travel(PORT.tr[0]);
export const SKIRT = 16; // pin to the bottom edge of the skirt
const IN0 = pinX(PORT.inl[1]) - SKIRT;
const IN1 = pinX(0) - SKIRT;
export const X_IN = [IN0 - 9, IN0]; // the inlet window in the wall, measured from the crank axis
export const DECK = crownX(0) + E.hc; // the head face: the volume above the crown is hc deep at TDC
export const exOpen = (th) => clamp((travel(th) - T_EX) / (E.stroke - T_EX), 0, 1);
export const trOpen = (th) => clamp((travel(th) - T_TR) / (E.stroke - T_TR), 0, 1);
export const inOpen = (th) => clamp((pinX(th) - SKIRT - IN0) / (IN1 - IN0), 0, 1);

/** the cycle seen as one 360° turn: 0 power ... 100 exhaust opens, 120 transfer opens, 240/260 close, ~345 spark */
const VT = volume(PORT.ex[1]);
const comp = (a) => Math.pow(VT / volume(a), 1.32);
const SPARK = -15;
const burn = (a) => 1 + 2.1 * smoother((a - SPARK) / 45);
export const pressure = (th) => {
  const t360 = mod(th, 360);
  // 125..260 the cylinder is open to the exhaust and the transfer ports: a little over atmospheric
  if (t360 >= 125 && t360 < 260) return 1.5 - 0.35 * smoother((t360 - 125) / 135);
  const a = wrap180(th); // -100 (ports close) .. 125
  if (a < SPARK) return Math.max(1.0, comp(a));
  if (a <= 30) return comp(a) * burn(a);
  const p30 = comp(30) * burn(30);
  const exp = (b) => p30 * Math.pow(volume(30) / volume(b), 1.25);
  if (a < 100) return exp(a);
  const p100 = exp(100);
  return lerp(p100, 1.5, smoother((a - 100) / 25));
};
const VCC_MIN = 90;
const vcc = (th) => VCC_MIN + (E.A * (E.stroke - travel(th))) / 1000;
/** crankcase pressure: the underside of the piston pumps the fresh charge up to the transfer ports */
export const crankcase = (th) => {
  const a = mod(th, 360);
  if (a < 65) return 0.95;
  const p120 = 0.95 * Math.pow(vcc(65) / vcc(120), 1.25);
  if (a < 120) return 0.95 * Math.pow(vcc(65) / vcc(a), 1.25);
  const p240 = lerp(p120, 1.15, smoother(1));
  if (a < 240) return lerp(p120, p240, smoother((a - 120) / 120));
  if (a < 295) return p240 * Math.pow(vcc(240) / vcc(a), 1.25);
  const p295 = p240 * Math.pow(vcc(240) / vcc(295), 1.25);
  return lerp(p295, 0.95, smoother((a - 295) / 20));
};
export const PHASES = ['COMPRESSION', 'POWER', 'BLOWDOWN', 'SCAVENGE', 'INTAKE'];
/** the name of the stroke at crank angle th */
export const phaseOf = (th) => {
  const a = mod(th, 360);
  if (a >= 345 || a < 8) return 'IGNITION';
  if (a < PORT.ex[0]) return 'POWER';
  if (a < PORT.tr[0]) return 'BLOWDOWN';
  if (a < PORT.tr[1]) return 'SCAVENGE';
  if (a < 295) return 'EXHAUST CLOSES';
  return 'COMPRESSION';
};
// what is in the cylinder: colour stops over the cycle (rgb, 0..1)
const C_FRESH = [0.24, 0.56, 0.88];
const C_BURN = [0.94, 0.35, 0.14];
const C_EXH = [0.55, 0.57, 0.6];
const C_COMP = [0.33, 0.45, 0.62];
const STOPS = [
  [0, C_BURN],
  [100, C_BURN],
  [122, C_EXH],
  [150, C_EXH],
  [230, C_FRESH],
  [262, C_FRESH],
  [330, C_COMP],
  [350, C_BURN],
  [360, C_BURN],
];
export const chargeColor = (th) => {
  const a = mod(th, 360);
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1][0] <= a) i++;
  const [a0, c0] = STOPS[i];
  const [a1, c1] = STOPS[i + 1];
  const k = smoother((a - a0) / (a1 - a0));
  return c0.map((v, j) => lerp(v, c1[j], k));
};
/** 0..1 how hot the gas glows */
export const glow = (th) => {
  const a = wrap180(th);
  return a > -12 && a < 110 ? smoother((a + 12) / 14) * (1 - smoother((a - 40) / 70)) : 0;
};

// ------------------------------------------------------------ the drive: variator, clutch, 22:1 final drive
export const D = {
  C: 310, // crank to driven-shaft distance
  r1min: 24,
  r1max: 40,
  rpmLo: 3000,
  rpmHi: 5800,
  clutch: [2800, 3300],
  stages: [[14, 56], [12, 66]], // pinion : gear, pinion : gear
  Rw: 280, // wheel rolling radius
  module: 2.57,
};
D.final = (D.stages[0][1] / D.stages[0][0]) * (D.stages[1][1] / D.stages[1][0]);
/** belt length for effective radii r1 (drive) and r2 (driven) at centre distance C */
export const beltLen = (r1, r2, C = D.C) => {
  const g = Math.asin((r2 - r1) / C);
  return 2 * Math.sqrt(C * C - (r2 - r1) ** 2) + r1 * (Math.PI - 2 * g) + r2 * (Math.PI + 2 * g);
};
const R2MAX = D.r1max;
const L0 = beltLen(D.r1min, R2MAX);
export const r1At = (rpm) => lerp(D.r1min, D.r1max, smoother((rpm - D.rpmLo) / (D.rpmHi - D.rpmLo)));
/** the driven radius the fixed belt length leaves when the drive pulley sits at r1 */
export const r2For = (r1) => {
  let lo = 8;
  let hi = 90;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (beltLen(r1, m) < L0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};
export const engaged = (rpm) => smoother((rpm - D.clutch[0]) / (D.clutch[1] - D.clutch[0]));
export const drive = (rpm) => {
  const r1 = r1At(rpm);
  const r2 = r2For(r1);
  const ratio = r2 / r1;
  const total = ratio * D.final;
  const e = engaged(rpm);
  const wheelRpm = (e * rpm) / total;
  const kmh = (wheelRpm * 2 * Math.PI * D.Rw * 60) / 1e6;
  return {r1, r2, ratio, total, e, wheelRpm, kmh, beltMs: ((rpm * 2 * Math.PI) / 60) * r1 * 0.001};
};
export const RATIO_LOW = D.r1max / D.r1min;
export const RATIO_HIGH = D.r1min / D.r1max;
/** the belt as a closed path around two circles: [x, y, nx, ny] samples, counter-clockwise, plus its length */
export function beltPath(c1, r1, c2, r2, n = 160) {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const L = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const gam = Math.acos((r1 - r2) / L);
  const aM = phi - gam;
  const aP = phi + gam;
  const tan = Math.sqrt(L * L - (r1 - r2) ** 2);
  const lenArc2 = r2 * 2 * gam;
  const lenArc1 = r1 * (2 * Math.PI - 2 * gam);
  const total = 2 * tan + lenArc1 + lenArc2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    let s = (i / n) * total;
    let x;
    let y;
    let nx;
    let ny;
    if (s < tan) {
      nx = Math.cos(aM);
      ny = Math.sin(aM);
      const k = s / tan;
      x = lerp(c1[0] + r1 * nx, c2[0] + r2 * nx, k);
      y = lerp(c1[1] + r1 * ny, c2[1] + r2 * ny, k);
    } else if ((s -= tan) < lenArc2) {
      const a = aM + s / r2;
      nx = Math.cos(a);
      ny = Math.sin(a);
      x = c2[0] + r2 * nx;
      y = c2[1] + r2 * ny;
    } else if ((s -= lenArc2) < tan) {
      nx = Math.cos(aP);
      ny = Math.sin(aP);
      const k = s / tan;
      x = lerp(c2[0] + r2 * nx, c1[0] + r1 * nx, k);
      y = lerp(c2[1] + r2 * ny, c1[1] + r1 * ny, k);
    } else {
      s -= tan;
      const a = aP + s / r1;
      nx = Math.cos(a);
      ny = Math.sin(a);
      x = c1[0] + r1 * nx;
      y = c1[1] + r1 * ny;
    }
    pts.push([x, y, nx, ny]);
  }
  return {pts, total};
}
