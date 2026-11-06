import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { dirname, join } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const compilerPath = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const compiler = spawn(process.execPath, [compilerPath, '-p', 'tsconfig.electron.json'], { stdio: 'inherit' });
const [code] = await once(compiler, 'exit');
if (code !== 0) process.exit(code || 1);

const server = await createServer();
await server.listen();
server.printUrls();
const env = { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173' };
delete env.ELECTRON_RUN_AS_NODE;
const desktop = spawn(require('electron'), ['.'], { stdio: 'inherit', env });
let closing = false;
async function close(exitCode = 0) {
  if (closing) return;
  closing = true;
  desktop.kill();
  await server.close();
  process.exit(exitCode);
}
desktop.on('error', (error) => { console.error(error); void close(1); });
desktop.on('exit', (exitCode) => void close(exitCode || 0));
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
