import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const desktop = spawn(require('electron'), process.argv.slice(2).length ? process.argv.slice(2) : ['.'], { stdio: 'inherit', env });
desktop.on('error', (error) => { console.error(error); process.exitCode = 1; });
desktop.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => desktop.kill());
process.on('SIGTERM', () => desktop.kill());
