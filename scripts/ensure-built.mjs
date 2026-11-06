// Decide whether the Windows launcher needs a rebuild. Exit 2 if stale,
// 0 if ready, 1 for an unexpected filesystem error.
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist', 'index.html');
if (!existsSync(output) || !existsSync(join(root, 'dist-electron', 'electron', 'main.js'))) process.exit(2);

const built = Math.min(statSync(output).mtimeMs, statSync(join(root,'dist-electron','electron','main.js')).mtimeMs);
const dirs = ['src', 'shared', 'electron', 'scripts', 'public'];
const files = ['package-lock.json', 'package.json', 'vite.config.mts', 'tsconfig.json', 'tsconfig.electron.json'];
function newer(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === '.git') continue;
      if (newer(path)) return true;
    } else if (item.isFile() && statSync(path).mtimeMs > built + 1000) return true;
  }
  return false;
}
try {
  if (files.some(file => existsSync(join(root, file)) && statSync(join(root, file)).mtimeMs > built + 1000) ||
      dirs.some(dir => existsSync(join(root, dir)) && newer(join(root, dir)))) process.exit(2);
} catch (error) {
  console.error('Unable to verify build freshness:', error);
  process.exit(1);
}
