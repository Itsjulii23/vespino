// node --test vespino-sim/tests/sound.test.mjs
// Renderiza el motor sin navegador y mide el audio: que el tono siga a las vueltas, que a ralentí sea irregular,
// que se abra con el gas y que no haya valores raros. (Que suene "bien" lo juzga el oído; esto evita regresiones.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EngineSynth } from '../engine-sound.js';

const SR = 44100;
function render(rpm, load, secs = 3, level = 1) {
  const s = new EngineSynth(SR);
  s.set(rpm, load, level);
  s.r = rpm; s.l = load; s.v = level; // sin rampas de arranque
  const out = new Float32Array(Math.round(SR * secs));
  for (let i = 0; i < out.length; i += 128) s.process(out.subarray(i, Math.min(i + 128, out.length)));
  return out;
}
// FFT radix-2 (potencia de 2)
function spectrum(x) {
  const N = 1 << 16; const re = new Float64Array(N); const im = new Float64Array(N);
  const off = x.length - N; // el final, ya estabilizado
  for (let i = 0; i < N; i++) re[i] = x[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= N; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(a * k), wi = Math.sin(a * k);
      const ur = re[i + k], ui = im[i + k];
      const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi, vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
    }
  }
  return Float64Array.from({ length: N / 2 }, (_, i) => Math.hypot(re[i], im[i]));
}
const binHz = SR / (1 << 16);
const band = (sp, hz, w = 1.5) => { let e = 0; for (let b = Math.round((hz - w) / binHz); b <= Math.round((hz + w) / binHz); b++) e += sp[b] ** 2; return e; };
// cuánto más energía hay en los múltiplos de f0 que entre ellos (1 = ruido; alto = tren de pulsos a f0)
function combRatio(x, f0) {
  const sp = spectrum(x); let on = 0, off = 0;
  for (let k = 1; k <= 12; k++) { on += band(sp, f0 * k); off += band(sp, f0 * (k + 0.5)); }
  return on / off;
}
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
function centroid(x) { const sp = spectrum(x); let a = 0, b = 0; for (let i = 5; i < 3000; i++) { a += i * binHz * sp[i]; b += sp[i]; } return a / b; }
function cycleCV(x, rpm) {
  const per = (SR * 60) / rpm; const peaks = [];
  for (let c = 4; (c + 1) * per < x.length; c++) { let m = 0; for (let i = Math.floor(c * per); i < (c + 1) * per; i++) m = Math.max(m, Math.abs(x[i])); peaks.push(m); }
  const mean = peaks.reduce((a, b) => a + b) / peaks.length;
  return Math.sqrt(peaks.reduce((a, b) => a + (b - mean) ** 2, 0) / peaks.length) / mean;
}

test('el audio es finito, no se satura y se calla con nivel 0', () => {
  for (const [rpm, load] of [[1800, 0], [3500, 0.5], [7000, 1]]) {
    const x = render(rpm, load, 1.5);
    assert.ok(x.every(Number.isFinite), `valores raros a ${rpm} rpm`);
    const peak = Math.max(...x.map(Math.abs));
    assert.ok(peak <= 0.9 + 1e-6 && peak > 0.1, `pico ${peak} a ${rpm} rpm`);
  }
  assert.equal(Math.max(...render(3000, 0.5, 1, 0).map(Math.abs)), 0);
});

test('un dos tiempos dispara una vez por vuelta: el tono es rpm/60 y sigue a las vueltas', () => {
  for (const rpm of [3000, 4500, 6000]) {
    const f0 = rpm / 60;
    const own = combRatio(render(rpm, 0.6, 3), f0);
    const wrong = combRatio(render(rpm, 0.6, 3), f0 * 1.37); // una frecuencia que no es la suya
    assert.ok(own > 3, `a ${rpm} rpm el tren de pulsos a ${f0} Hz debe verse: ${own.toFixed(1)}`);
    assert.ok(own > wrong * 2, `a ${rpm} rpm ${f0} Hz (${own.toFixed(1)}) debe ganar a ${(f0 * 1.37).toFixed(0)} Hz (${wrong.toFixed(1)})`);
  }
});

test('a ralentí los ciclos son irregulares y con el gas abierto se igualan', () => {
  const idle = cycleCV(render(1800, 0, 6), 1800);
  const open = cycleCV(render(5000, 1, 4), 5000);
  assert.ok(idle > 0.15, `ralentí: variación entre ciclos ${idle.toFixed(2)}`);
  assert.ok(open < 0.1, `a fondo: variación entre ciclos ${open.toFixed(2)}`);
});

test('con más gas suena más fuerte y más brillante, y con más vueltas también', () => {
  assert.ok(rms(render(4000, 1)) > rms(render(4000, 0.1)) * 1.1);
  assert.ok(centroid(render(4000, 1)) > centroid(render(4000, 0)) * 1.1, 'el filtro se abre con el gas');
  assert.ok(centroid(render(6500, 0.7)) > centroid(render(2500, 0.7)), 'más vueltas, más agudo');
});
