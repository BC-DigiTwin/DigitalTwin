import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  serverExternalPackages: ['mysql2'],
  // Keep Vite’s solution-style root `tsconfig.json`; Next uses its own project file.
  typescript: {
    tsconfigPath: 'tsconfig.next.json',
    // src/ is primarily typechecked by Vite/tsc; allow deploy despite legacy strict errors.
    ignoreBuildErrors: true,
  },
  // Vite + R3F live under `src/`; Next should only lint the App Router surface.
  eslint: {
    dirs: ['app', 'lib'],
  },
}

export default nextConfig
