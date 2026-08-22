import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'utf-8-validate',
        'electron-store',
        'obs-websocket-js',
      ]
    }
  }
});
