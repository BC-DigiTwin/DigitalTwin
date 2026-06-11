/**
 * Vite proxies `/api/*` to http://localhost:3000. If another process already
 * owns that port, `next dev` silently moves to 3001 and the frontend hits a
 * stale or broken API — building panels fall back to mock data or stay empty.
 */
import net from 'node:net'

const PORT = 3000

function portIsFree() {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(PORT)
  })
}

const free = await portIsFree()
if (!free) {
  console.error('')
  console.error(`Port ${PORT} is already in use.`)
  console.error('Vite forwards /api requests to http://localhost:3000 — Next.js must use that port.')
  console.error('')
  console.error('Stop the old server, then restart:')
  console.error(`  lsof -ti :${PORT} | xargs kill`)
  console.error('  npm run dev:next')
  console.error('')
  process.exit(1)
}
