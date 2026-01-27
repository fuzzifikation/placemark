import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  root: './src/renderer',
  plugins: [
    react(),
    electron([
      {
        entry: '../main/index.ts',
        vite: {
          build: {
            outDir: '../../dist-electron/main',
            rollupOptions: {
              external: ['better-sqlite3', 'electron', 'exifr', 'sharp'],
            },
          },
        },
      },
      {
        entry: '../preload/index.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: '../../dist-electron/preload',
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
});
