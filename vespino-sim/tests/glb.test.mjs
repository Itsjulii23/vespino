// node --test vespino-sim/tests/glb.test.mjs
// Comprueba el GLB del Mortadelo que se incrusta en la maqueta, sin dependencias.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GLB_IDS } from '../glb-ids.js';

const path = fileURLToPath(new URL('../mortadelo.glb', import.meta.url));

function readGltf(file) {
  const b = readFileSync(file);
  assert.equal(b.readUInt32LE(0), 0x46546c67, 'cabecera glTF');
  const len = b.readUInt32LE(12);
  assert.equal(b.readUInt32LE(16), 0x4e4f534a, 'primer chunk JSON');
  return JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
}

test('el GLB pesa menos de 4 MB', () => {
  assert.ok(statSync(path).size < 4 * 1024 * 1024, `${statSync(path).size} bytes`);
});

test('tiene un nodo por cada pieza fija y ninguna de sobra', () => {
  const names = readGltf(path).nodes.map(n => n.name);
  assert.deepEqual([...names].sort(), [...GLB_IDS].sort());
});

test('está en coordenadas de la maqueta: eje trasero en el origen, y arriba', () => {
  const g = readGltf(path);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  g.nodes.forEach(n => {
    if (n.mesh == null) return;
    const t = n.translation || [0, 0, 0];
    for (const p of g.meshes[n.mesh].primitives) {
      const a = g.accessors[p.attributes.POSITION];
      for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], a.min[i] + t[i]); hi[i] = Math.max(hi[i], a.max[i] + t[i]); }
    }
  });
  // trasera: la cola llega a ~0,31 m por detrás del eje trasero; el guardabarros delantero acaba ~0,16 m
  // por delante del eje delantero (1,13), donde termina su arco a 60°
  assert.ok(lo[0] > -0.33 && lo[0] < -0.28, `x min ${lo[0]}`);
  assert.ok(hi[0] > 1.25 && hi[0] < 1.35, `x max ${hi[0]}`);
  assert.ok(hi[1] > 1.0 && hi[1] < 1.07, `altura ${hi[1]}`);   // y arriba
  assert.ok(Math.abs(hi[2] + lo[2]) < 0.05, `simétrico en z ${lo[2]}..${hi[2]}`);
});

test('solo usa los materiales de la skill', () => {
  const ok = new Set(['pintura', 'pintura_interior', 'cromo', 'aluminio', 'carter', 'acero', 'goma', 'asiento', 'cristal', 'piloto', 'esfera', 'porcelana']);
  for (const m of readGltf(path).materials) assert.ok(ok.has(m.name), m.name);
});
