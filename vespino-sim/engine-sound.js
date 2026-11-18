// The sound of a 49 cc two-stroke, built from how the engine makes noise instead of from a synth patch:
//  - a two-stroke fires once every turn, so the exhaust gets one pressure pulse per revolution (rpm / 60 Hz);
//  - the pulse is a short blow-down (a few milliseconds) plus a burst of noise, shaped by the pipe and the silencer
//    (a tail-pipe comb and two chamber resonances), then a low-pass that opens as the throttle opens;
//  - at idle the cycles are uneven and some barely burn ("four-stroking"), which gives the putt-putt; with the throttle
//    open they even out into a buzz;
//  - open throttle also adds the carburettor's intake hiss, and the piston and clutch add a faint mechanical tick.
// EngineSynth is self-contained (no imports, no outer references): its source is also loaded into an AudioWorklet.
export class EngineSynth {
  constructor(sr = 44100) {
    this.sr = sr;
    this.rpm = 1800; // wanted values, set from outside
    this.load = 0;
    this.level = 0;
    this.r = 1800; // smoothed values, used by the sound
    this.l = 0;
    this.v = 0;
    this.ph = 0; // crank turn, 0..1
    this.seed = 2463534242;
    this.env = 0; // noise burst of the current firing
    this.imp = 0; // pending exhaust pulse
    this.p1 = 0;
    this.p2 = 0;
    this.mech = 0;
    this.hp = 0;
    this.D = Math.round(sr / 420); // tail pipe resonance, about 420 Hz
    this.cb = new Float32Array(this.D);
    this.ci = 0;
    this.s = Array.from({length: 6}, () => [0, 0, 0, 0]);
    const k = (t) => 1 - Math.exp(-1 / (sr * t));
    this.k = {rise: k(0.0004), fall: k(0.0012), rpm: k(0.06), load: k(0.08), lev: k(0.05), env: Math.exp(-1 / (sr * 0.0025)), mech: Math.exp(-1 / (sr * 0.0006)), hp: 1 - Math.exp((-2 * Math.PI * 25) / sr)};
  }

  set(rpm, load, level) {
    this.rpm = rpm;
    this.load = load;
    this.level = level;
  }

  _rnd() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 4294967296;
  }

  // one firing: how hard this cycle burns
  _fire() {
    const idle = Math.min(1, Math.max(0, 1 - (this.r - 1500) / 2500 - this.l * 0.8));
    let a = 0.55 + 0.45 * this.l;
    if (this._rnd() < 0.2 * idle) a *= 0.25 + 0.2 * this._rnd(); // a weak, nearly missed cycle
    else a *= 1 - idle * 0.3 * this._rnd() - 0.05 * this._rnd();
    this.imp = a * this.sr * 0.0015;
    this.env = a;
  }

  _coef(type, f, q) {
    const w = (2 * Math.PI * Math.min(f, this.sr * 0.45)) / this.sr;
    const c = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    const b0 = type === 'lp' ? (1 - c) / 2 : a;
    const b1 = type === 'lp' ? 1 - c : 0;
    const b2 = type === 'lp' ? b0 : -a;
    const a0 = 1 + a;
    return [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - a) / a0];
  }

  // fills `out` (a Float32Array) with mono samples
  process(out) {
    const n = out.length;
    const K = this.k;
    const s = this.s;
    const cut = 1400 + 2600 * this.l + this.r * 0.15;
    const c = [this._coef('bp', 260, 1.4), this._coef('bp', 950, 2), this._coef('lp', cut, 0.7), this._coef('lp', cut, 0.7), this._coef('bp', 1400, 0.8), this._coef('bp', 3200, 1)];
    const idle = Math.min(1, Math.max(0, 1 - (this.r - 1500) / 2500 - this.l * 0.8));
    const intakeK = Math.pow(this.l, 1.5) * (this.r / 7000) * 0.35;
    const mechK = 0.12 + idle * 0.12;
    const bq = (co, st, x) => {
      const y = co[0] * x + co[1] * st[0] + co[2] * st[1] - co[3] * st[2] - co[4] * st[3];
      st[1] = st[0];
      st[0] = x;
      st[3] = st[2];
      st[2] = y;
      return y;
    };
    for (let i = 0; i < n; i++) {
      this.r += (this.rpm - this.r) * K.rpm;
      this.l += (this.load - this.l) * K.load;
      this.v += (this.level - this.v) * K.lev;
      const f = this.r / 60 / this.sr;
      this.ph += f;
      if (this.ph >= 1) {
        this.ph -= 1;
        this._fire();
      }
      if (this.ph >= 0.5 && this.ph - f < 0.5) this.mech = 0.6; // the piston passes its slap point
      // exhaust pulse: a spike smoothed twice gives a rounded blow-down, plus the noise burst of the burning gas
      this.p1 += (this.imp - this.p1) * K.rise;
      this.imp = 0;
      this.p2 += (this.p1 - this.p2) * K.fall;
      const burst = (this._rnd() * 2 - 1) * this.env;
      this.env *= K.env;
      const exh = this.p2 + burst * (0.35 + 0.5 * this.l);
      // tail pipe, silencer chambers, then the tone control that opens with the throttle
      const cy = exh + this.cb[this.ci] * 0.5;
      this.cb[this.ci] = cy;
      this.ci = (this.ci + 1) % this.D;
      let y = cy * 0.55 + bq(c[0], s[0], cy) * 0.9 + bq(c[1], s[1], cy) * 0.35;
      y = bq(c[3], s[3], bq(c[2], s[2], y));
      const intake = bq(c[4], s[4], this._rnd() * 2 - 1) * intakeK;
      const tick = bq(c[5], s[5], this._rnd() * 2 - 1) * this.mech * mechK;
      this.mech *= K.mech;
      const sum = y + intake + tick;
      this.hp += (sum - this.hp) * K.hp; // pulses are one-sided: take the DC out
      out[i] = Math.tanh((sum - this.hp) * (1.1 + this.l)) * 0.9 * this.v;
    }
  }
}

// The audio graph. Runs the synth in an AudioWorklet when the browser allows it (also from file://), and on a
// ScriptProcessor otherwise. set(rpm, load, level) is cheap enough to call every frame.
export function createEngineAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const out = ctx.createGain();
  out.gain.value = 0.8;
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  out.connect(an);
  an.connect(ctx.destination);
  let target = [1800, 0, 0];
  let port = null;
  const api = {ctx, kind: 'pending'};
  const useScript = () => {
    const synth = new EngineSynth(ctx.sampleRate);
    const node = ctx.createScriptProcessor(2048, 0, 1);
    node.onaudioprocess = (e) => {
      synth.set(target[0], target[1], target[2]);
      synth.process(e.outputBuffer.getChannelData(0));
    };
    node.connect(out);
    api.kind = 'script';
  };
  const code = `const Synth = ${EngineSynth.toString()};
registerProcessor('vespino-engine', class extends AudioWorkletProcessor {
  constructor() { super(); this.s = new Synth(sampleRate); this.port.onmessage = (e) => this.s.set(e.data[0], e.data[1], e.data[2]); }
  process(inputs, outputs) { this.s.process(outputs[0][0]); return true; }
});`;
  const useWorklet = async () => {
    if (!ctx.audioWorklet) throw new Error('sin AudioWorklet');
    const url = URL.createObjectURL(new Blob([code], {type: 'text/javascript'}));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const node = new AudioWorkletNode(ctx, 'vespino-engine', {numberOfInputs: 0, outputChannelCount: [1]});
    port = node.port;
    port.postMessage(target);
    node.connect(out);
    api.kind = 'worklet';
  };
  useWorklet().catch(useScript);
  const buf = new Float32Array(an.fftSize);
  Object.assign(api, {
    set(rpm, load, level) {
      target = [rpm, load, level];
      if (port) port.postMessage(target);
    },
    resume: () => ctx.resume(),
    rms() {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      return Math.sqrt(sum / buf.length);
    },
  });
  return api;
}
