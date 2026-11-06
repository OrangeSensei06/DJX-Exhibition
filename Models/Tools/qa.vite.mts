import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)), base: './',
  build: { outDir: '../Source/runtime-qa-dist', emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL('runtime_qa.html', import.meta.url)) } },
});
