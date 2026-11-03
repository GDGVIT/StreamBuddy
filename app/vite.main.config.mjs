import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // Optional speed-ups for the WebSocket library OBS uses. They aren't installed,
      // and it works without them. Everything else is bundled into main.js, because the
      // packaged app only contains Vite's output, not node_modules.
      external: ['bufferutil', 'utf-8-validate']
    }
  }
});
