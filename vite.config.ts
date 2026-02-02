// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 1. Force Vite to treat 3D models as static assets
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    // 2. (Optional) Open browser automatically when you start 'npm run dev'
    open: true,
  },
  build: {
    // 3. optimize build for 3D performance
    target: 'esnext', // Use modern JS features (smaller bundle)
    chunkSizeWarningLimit: 1500, // Increase warning limit (3D libs are huge)
  }
})