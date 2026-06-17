// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'backend/tests/**'],
  },
  // 1. Force Vite to treat 3D models as static assets
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    // 2. (Optional) Open browser automatically when you start 'npm run dev'
    open: true,
    // Forward API requests to the Next.js dev server (`npm run dev:next`, port 3000)
    // so route handlers like `app/api/buildings/[id]/route.ts` are reachable from
    // the Vite-served R3F app on port 5173 without CORS plumbing.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 3. optimize build for 3D performance
    target: 'esnext', // Use modern JS features (smaller bundle)
    chunkSizeWarningLimit: 1500, // Increase warning limit (3D libs are huge)
  }
})