import { mkdir, cp, stat, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzipSync, zipSync } from 'three/addons/libs/fflate.module.js';
import { attachTaskMetadata } from './tflite-metadata.mjs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const target = resolve('public/vision');
await mkdir(target, { recursive: true });
const packageRoot = dirname(require.resolve('@mediapipe/tasks-vision'));
await cp(resolve(packageRoot, 'wasm'), resolve(target, 'wasm'), { recursive: true });

const modelPath = resolve(target, 'hand_landmarker.task');
const existing = await stat(modelPath).catch(() => null);
if (!existing || existing.size < 1_000_000) {
  const url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  console.log('Downloading the version 1 hand-landmark model…');
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`Model download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1_000_000) throw new Error('Model response was unexpectedly small.');
  await writeFile(modelPath, bytes);
}
console.log('Local hand model and WASM runtime are ready. No runtime CDN is used.');

const litePath = resolve(target, 'hand_landmarker_lite.task');
const components = [
  ['hand_detector.tflite', 'https://storage.googleapis.com/mediapipe-assets/palm_detection_lite.tflite'],
  ['hand_landmarks_detector.tflite', 'https://storage.googleapis.com/mediapipe-assets/hand_landmark_lite.tflite'],
];
const existingLite = await stat(litePath).catch(() => null);
const savedProvenance = await readFile(resolve(target, 'lite-model-provenance.json'), 'utf8').then(JSON.parse).catch(() => null);
if (!existingLite || savedProvenance?.metadataVersion !== 2 || process.argv.includes('--refresh-lite')) {
  const files = {};
  const provenance = [];
  const reference = unzipSync(new Uint8Array(await readFile(modelPath)));
  for (const [name, url] of components) {
    const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error(`Lite model download failed: ${response.status} ${url}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 100_000 || Buffer.from(bytes.subarray(4, 8)).toString() !== 'TFL3') throw new Error(`Invalid Lite model: ${name}`);
    files[name] = attachTaskMetadata(bytes, reference[name]);
    provenance.push({ name, url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  // The Tasks API accepts a ZIP with these two official sub-model filenames.
  const alignedFiles = {};
  let cursor = 0;
  for (const [name, bytes] of Object.entries(files)) {
    const padding = (16 - (cursor + 30 + Buffer.byteLength(name) + 4) % 16) % 16;
    alignedFiles[name] = [bytes, { extra: { 21111: new Uint8Array(padding) } }];
    cursor += 30 + Buffer.byteLength(name) + 4 + padding + bytes.length;
  }
  await writeFile(litePath, zipSync(alignedFiles, { level: 0 }));
  await writeFile(resolve(target, 'lite-model-provenance.json'), JSON.stringify({ metadataVersion: 2, sources: provenance,
    packaging: 'Google Lite model weights, with preprocessing/output metadata and associated labels copied from the official full Tasks bundle' }, null, 2));
}
const liteBytes = (await readFile(litePath)).length;
console.log(`Lite hand model ready: ${(liteBytes / 1e6).toFixed(2)} MB (full bundle: ${(await stat(modelPath)).size / 1e6} MB).`);
