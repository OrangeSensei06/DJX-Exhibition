import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Separate build entry: the exhibition's existing screens remain independent.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist-biryani-preview',
    rollupOptions: { input: fileURLToPath(new URL('../biryani-preview.html', import.meta.url)) },
  },
});
