// Copie Stockfish (WASM, lite, single-thread) depuis node_modules vers public/engine.
// Version single-thread : aucun en-tête COOP/COEP requis, fonctionne partout sur Vercel.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'stockfish', 'bin');
const dest = join(root, 'public', 'engine');
const files = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'];

if (!existsSync(src)) {
  console.warn('[copy-engine] stockfish non installé, étape ignorée');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of files) copyFileSync(join(src, f), join(dest, f));
console.log('[copy-engine] Stockfish copié dans public/engine');
