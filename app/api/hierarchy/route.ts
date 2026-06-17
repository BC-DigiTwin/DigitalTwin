import { NextResponse } from 'next/server'

import { buildLocationTree, getDbPool, type LocationRow } from '../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HIERARCHY_QUERY = `
  WITH RECURSIVE location_tree AS (
    SELECT
      id, parent_id, type, name, description,
      position_x, position_y, position_z,
      rotation_x, rotation_y, rotation_z,
      scale_x, scale_y, scale_z,
      floor_number, room_number, area_sqft,
      model_url, texture_url, thumbnail_url,
      model_format, is_navigable, is_visible,
      is_interactive, display_order,
      0 AS level
    FROM locations
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
      l.id, l.parent_id, l.type, l.name, l.description,
      l.position_x, l.position_y, l.position_z,
      l.rotation_x, l.rotation_y, l.rotation_z,
      l.scale_x, l.scale_y, l.scale_z,
      l.floor_number, l.room_number, l.area_sqft,
      l.model_url, l.texture_url, l.thumbnail_url,
      l.model_format, l.is_navigable, l.is_visible,
      l.is_interactive, l.display_order,
      parent.level + 1
    FROM locations l
    INNER JOIN location_tree parent ON l.parent_id = parent.id
  )
  SELECT * FROM location_tree
  ORDER BY parent_id, display_order, name
`

export async function GET(): Promise<NextResponse> {
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
    const [rows] = await pool.execute<LocationRow[]>(HIERARCHY_QUERY)
    return NextResponse.json({ success: true, data: buildLocationTree(rows) })
  } catch (err) {
    console.error('[api/hierarchy] MySQL error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hierarchy' },
      { status: 500 },
    )
  }
}
