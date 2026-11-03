import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Renderer tests run in jsdom (a simulated browser). Main-process tests opt into Node
// with a `@vitest-environment node` comment at the top of the file.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['./test/setup.js'],
    restoreMocks: true
  }
})
