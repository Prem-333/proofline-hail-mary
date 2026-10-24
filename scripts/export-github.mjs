import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const destination = path.resolve(process.argv[2] || path.join(root, '..', 'Proofline-GitHub'));
if (destination === root || destination.startsWith(root + path.sep)) throw new Error('Choose an export folder outside the working project.');
try {
    if ((await readdir(destination)).length) throw new Error('The export folder must be empty. Existing files will not be overwritten.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(destination, { recursive: true });
const directories = ['app', 'db', 'drizzle', 'lib', 'worker', 'scripts', 'tests', '.github', '.openai'];
for (const name of directories) await cp(path.join(root, name), path.join(destination, name), { recursive: true });
for (const name of ['components', 'public', 'docs']) await mkdir(path.join(destination, name), { recursive: true });
for (const name of ['proofline-app.tsx', 'source-impact.tsx']) await cp(path.join(root, 'components', name), path.join(destination, 'components', name));
await cp(path.join(root, 'public', 'favicon.svg'), path.join(destination, 'public', 'favicon.svg'));
for (const name of await readdir(path.join(root, 'docs'))) if (name.endsWith('.md')) await cp(path.join(root, 'docs', name), path.join(destination, 'docs', name));
const files = ['.gitignore', '.npmrc', 'cloudflare-env.d.ts', 'drizzle.config.ts', 'eslint.config.mjs', 'next.config.ts', 'package.json', 'package-lock.json', 'postcss.config.mjs', 'tsconfig.json', 'vite.config.ts', 'THIRD_PARTY.md'];
for (const name of files) await cp(path.join(root, name), path.join(destination, name));
let readme = await readFile(path.join(root, 'README.md'), 'utf8');
readme = readme.replace(' · [Round 2 project PDF](docs/Proofline-Round-2.pdf)', '');
readme += '\n## Repository layout\n\nSee [the project structure](docs/PROJECT_STRUCTURE.md). This folder contains source and project documentation only; dependencies, build output, local state and the submission PDF are excluded.\n';
await writeFile(path.join(destination, 'README.md'), readme);
console.log(destination);
