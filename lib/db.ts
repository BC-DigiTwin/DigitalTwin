import type { RowDataPacket } from 'mysql2'
import mysql from 'mysql2/promise'

const globalForPool = globalThis as unknown as {
  dbPool?: mysql.Pool
}

export function getDbPool(): mysql.Pool {
  if (globalForPool.dbPool) {
    return globalForPool.dbPool
  }

  const host = process.env.DB_HOST
  const port = Number(process.env.DB_PORT) || 3306
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME

  if (!host || !user || !password || !database) {
    throw new Error('Missing database environment variables')
  }

  globalForPool.dbPool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })

  return globalForPool.dbPool
}

export type LocationRow = RowDataPacket & {
  id: number
  parent_id: number | null
  children?: LocationRow[]
  [key: string]: unknown
}

export function buildLocationTree(
  nodes: LocationRow[],
  parentId: number | null = null,
): LocationRow[] {
  const tree: LocationRow[] = []

  for (const node of nodes) {
    if (node.parent_id == parentId) {
      const children = buildLocationTree(nodes, node.id)
      if (children.length > 0) {
        node.children = children
      }
      tree.push(node)
    }
  }

  return tree
}
