import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origen = resolve(raiz, '..', 'vespino-3d.html');
const destino = resolve(raiz, 'public', 'maqueta', 'index.html');

if (!existsSync(origen)) {
  console.error(`No encuentro la maqueta en ${origen}`);
  process.exit(1);
}
mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origen, destino);
console.log(`Maqueta copiada a ${destino}`);
