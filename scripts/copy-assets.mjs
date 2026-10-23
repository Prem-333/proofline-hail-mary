import { mkdir, copyFile } from 'node:fs/promises';
await mkdir(new URL('../public/vendor/',import.meta.url),{recursive:true});
await copyFile(new URL('../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url),new URL('../public/vendor/pdf.worker.min.mjs',import.meta.url));
