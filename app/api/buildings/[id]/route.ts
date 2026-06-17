import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'

import { getDbPool } from '../../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

type BuildingRow = RowDataPacket & {
  id: string
  name: string | null
  image_url: string | null
  primary_purpose: string | null
  operating_hours: string | null
  menu_tabs: unknown
}

/**
 * mysql2 will normally hand back JSON columns already parsed into objects,
 * but depending on server config / driver version it can return a raw string.
 * This helper guarantees the caller always gets a real object (or null).
 */
function parseMenuTabs(value: unknown): Record<string, unknown> | null {
  if (value == null) return null
  if (typeof value === 'object') return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  return null
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params

  let pool
  try {
    pool = getDbPool()
  } catch {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  try {
    const [rows] = await pool.execute<BuildingRow[]>(
      'SELECT id, name, image_url, primary_purpose, operating_hours, menu_tabs FROM buildings WHERE id = ? LIMIT 1',
      [id],
    )

    const row = rows[0]
    if (!row) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      id: row.id,
      name: row.name,
      image_url: row.image_url,
      primary_purpose: row.primary_purpose,
      operating_hours: row.operating_hours,
      menu_tabs: parseMenuTabs(row.menu_tabs),
    })
  } catch (err) {
    console.error('[api/buildings/[id]] MySQL error:', err)
    return NextResponse.json(
      { error: 'Failed to load building' },
      { status: 500 },
    )
  }
}
