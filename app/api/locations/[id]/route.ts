import { NextResponse } from 'next/server'

import { buildLocationTree, getDbPool, type LocationRow } from '../../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

const LOCATION_SUBTREE_QUERY = `
  WITH RECURSIVE location_subtree AS (
    SELECT * FROM locations WHERE id = ?

    UNION ALL

    SELECT l.* FROM locations l
    INNER JOIN location_subtree ls ON l.parent_id = ls.id
  )
  SELECT * FROM location_subtree
  ORDER BY parent_id, display_order, name
`

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params
  const locationId = Number(id)

  if (!Number.isFinite(locationId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid location id' },
      { status: 400 },
    )
  }

  let pool
  try {
    pool = getDbPool()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Database is not configured' },
      { status: 503 },
    )
  }

  try {
    const [rows] = await pool.execute<LocationRow[]>(
      LOCATION_SUBTREE_QUERY,
      [locationId],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 },
      )
    }

    const tree = buildLocationTree(rows, locationId)
    return NextResponse.json({
      success: true,
      data: { location: tree[0] ?? null },
    })
  } catch (err) {
    console.error('[api/locations/[id]] MySQL error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
      { status: 500 },
    )
  }
}
