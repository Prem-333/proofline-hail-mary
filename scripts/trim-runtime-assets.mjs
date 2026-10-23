import {readdir,unlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
// Transformers.js is explicitly configured to load this exact runtime from
// jsDelivr. Vite also emits an unused fallback copy; omit only that copy.
const directory=resolve('dist/client/_next/static/media');
for(const file of await readdir(directory)) {
  if(/^ort-wasm-simd-threaded\.asyncify\.[A-Za-z0-9_-]+\.wasm$/.test(file)) {
    await unlink(join(directory,file));
    console.log('Omitted redundant CDN-hosted ONNX runtime asset.');
  }
}
