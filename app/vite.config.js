import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
      },
      '/login.php': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
      },
    },
  },
});
