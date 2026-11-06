// Refresh only the imported module's WASM. Existing DJX vision assets stay separate.
import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtime = dirname(require.resolve('gesture-lab-vision'));
const pkg = JSON.parse(await readFile(resolve(runtime, 'package.json'), 'utf8'));
if (pkg.version !== '0.10.35') throw new Error('Gesture Lab requires MediaPipe 0.10.35');
const target = resolve(root, 'public/vision/gesture-lab');
const model = resolve(target, 'models/hand_landmarker.task');
if ((await stat(model)).size < 1_000_000) throw new Error('Imported Gesture Lab hand model is missing or invalid');
await mkdir(resolve(target, 'wasm'), { recursive: true });
await cp(resolve(runtime, 'wasm'), resolve(target, 'wasm'), { recursive: true });
console.log('Gesture Lab local model and matching MediaPipe 0.10.35 WASM are ready.');
