import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Vite’s solution-style root `tsconfig.json`; Next uses its own project file.
  typescript: {
    tsconfigPath: 'tsconfig.next.json',
  },
  // Vite + R3F live under `src/`; Next should only lint the App Router surface.
  eslint: {
    dirs: ['app', 'lib'],
  },
}

export default nextConfig
