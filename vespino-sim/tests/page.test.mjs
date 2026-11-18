// node --test vespino-sim/tests/page.test.mjs        (PAGE=ruta/al.html para probar otro archivo)
// Abre la maqueta compilada por file:// con la red cortada y comprueba que la moto es el Mortadelo del GLB.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { GLB_IDS } from '../glb-ids.js';
const { chromium } = await import(pathToFileURL(path.join(process.env.USERPROFILE || process.env.HOME, '.claude/skills/teardown/node_modules/playwright/index.mjs')).href);

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.resolve(process.env.PAGE || path.join(here, '../../teardown-out/dist/vespino-sim.html'));
const partsTxt = readFileSync(path.join(here, '../parts.js'), 'utf8');
const WHEEL_IDS = ['t', 'd'].flatMap((w) => ['neumatico', 'llanta', 'tambor'].map((p) => `rueda-${w}-${p}`));
const PART_IDS = [...new Set([...partsTxt.matchAll(/^\s*'?([a-z][a-z0-9-]*)'?: \{\s*$/gm)].map((m) => m[1]))].filter((id) => id !== 'rel').concat(WHEEL_IDS);

let browser, page;
const errors = [];
before(async () => {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route('**', (r) => (r.request().url().startsWith('file:') || r.request().url().startsWith('data:') ? r.continue() : r.abort()));
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(pathToFileURL(PAGE).href);
  await page.waitForFunction(() => window.LIVE && window.LIVE.st && window.__vespino, null, { timeout: 60000 });
});
after(async () => browser && (await browser.close()));

test('carga sin errores y con todas las piezas del GLB', async () => {
  assert.deepEqual(errors, []);
  const ids = await page.evaluate(() => window.__vespino.glbIds);
  assert.deepEqual([...ids].sort(), [...GLB_IDS].sort());
});

test('cada pieza del catálogo tiene malla', async () => {
  const have = await page.evaluate(() => Object.fromEntries(Object.entries(window.LIVE.st.bike.partMeshes).map(([k, v]) => [k, v.length])));
  const missing = PART_IDS.filter((id) => !(have[id] > 0));
  assert.equal(PART_IDS.length, 43, `ids leídos: ${PART_IDS.length}`);
  assert.deepEqual(missing, []);
});

test('las piezas fijas son las del GLB, no las de código', async () => {
  // una malla del GLB trae geometría indexada con muchos vértices; la U del código tenía 3232
  const n = await page.evaluate(() => window.LIVE.st.bike.partMeshes['chasis'].reduce((s, m) => s + m.geometry.attributes.position.count, 0));
  assert.ok(n > 3500, `vértices del chasis: ${n}`);
});

test('el color de la pestaña Modelos pinta la chapa del GLB', async () => {
  const hex = await page.evaluate(() => {
    const b = window.LIVE.st.bike; b.setPaint('#ff0000');
    const h = b.partMeshes['chasis'][0].material.color.getHexString(); b.setPaint('#86c872'); return h;
  });
  assert.equal(hex, 'ff0000');
});

test('el corte de cristal vuelve transparentes la chapa y el cilindro', async () => {
  const r = await page.evaluate(() => {
    const b = window.LIVE.st.bike; b.setCut('glass');
    // la malla principal de la pieza (la de más vértices); las ventanas de las lumbreras son opacas a propósito
    const op = (id) => { const m = [...b.partMeshes[id]].sort((a, c) => c.geometry.attributes.position.count - a.geometry.attributes.position.count)[0]; return m.material.transparent ? m.material.opacity : 1; };
    const out = { trasera: op('trasera'), cilindro: op('cilindro'), carter: op('carter') }; b.setCut('solid'); return out;
  });
  for (const [k, v] of Object.entries(r)) assert.ok(v < 0.5, `${k} opacidad ${v}`);
});

test('cotas del Mortadelo: 1,13 m entre ejes, correa en sus poleas, pistón dentro del cilindro', async () => {
  const r = await page.evaluate(() => {
    const b = window.LIVE.st.bike; b.update({ th: 0, rpm: 3000 });
    const c = (id) => { const x = b.partBox(id).clone(); return { min: x.min.toArray(), max: x.max.toArray() }; };
    return { rt: c('rueda-t-neumatico'), rd: c('rueda-d-neumatico'), correa: c('correa'), motriz: c('motriz'), conducida: c('conducida'), piston: c('piston'), cil: c('cilindro'), culata: c('culata') };
  });
  const cx = (b) => (b.min[0] + b.max[0]) / 2;
  assert.ok(Math.abs(cx(r.rd) - cx(r.rt) - 1.13) < 0.005, `entre ejes ${cx(r.rd) - cx(r.rt)}`);
  assert.ok(r.rt.min[1] > -0.005 && r.rt.min[1] < 0.005, `rueda trasera apoya en el suelo: ${r.rt.min[1]}`);
  // la correa abraza las dos poleas: pasa por delante del eje de la motriz y por detrás del de la conducida,
  // sin salirse del diámetro de ninguna (a bajas vueltas va por dentro de las caras de la motriz)
  assert.ok(r.correa.max[0] > cx(r.motriz) + 0.01 && r.correa.max[0] <= r.motriz.max[0] + 0.005, `correa en la motriz: ${r.correa.max[0]} / ${cx(r.motriz)}..${r.motriz.max[0]}`);
  assert.ok(r.correa.min[0] < cx(r.conducida) - 0.01 && r.correa.min[0] >= r.conducida.min[0] - 0.005, `correa en la conducida: ${r.correa.min[0]} / ${r.conducida.min[0]}..${cx(r.conducida)}`);
  const zone = { min: [Math.min(r.cil.min[0], r.culata.min[0]) - 0.01, Math.min(r.cil.min[1], r.culata.min[1]) - 0.01], max: [Math.max(r.cil.max[0], r.culata.max[0]) + 0.01, Math.max(r.cil.max[1], r.culata.max[1]) + 0.01] };
  const pc = [(r.piston.min[0] + r.piston.max[0]) / 2, (r.piston.min[1] + r.piston.max[1]) / 2];
  assert.ok(pc[0] > zone.min[0] && pc[0] < zone.max[0] && pc[1] > zone.min[1] && pc[1] < zone.max[1], `pistón en ${pc}`);
});
