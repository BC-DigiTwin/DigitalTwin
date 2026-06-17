import { TERRAIN_GROUND_PLANE_BOUNDS } from '../constants/sceneMaterials'

/**
 * Vertical offset placed *above* the terrain plane so waypoint geometry
 * (ring + beam base) sits just above the grid lines without z-fighting.
 *
 * Kept tiny so the ring still reads as flush with the ground.
 */
export const WAYPOINT_GROUND_LIFT = 0.04

/**
 * Returns the canonical Y value a waypoint should sit at for the given world
 * (x, z) — currently a constant `positionY + WAYPOINT_GROUND_LIFT` because
 * the terrain is a flat plane. Routed through a function so callers stay
 * future-proof against a real heightmap (raycast-against-terrain later swap
 * happens entirely inside this util).
 */
export function snapWaypointYToTerrain(_x: number, _z: number): number {
  return TERRAIN_GROUND_PLANE_BOUNDS.positionY + WAYPOINT_GROUND_LIFT
}

/**
 * Clamps an XZ coordinate to the campus terrain footprint, with a small inset
 * so placed waypoints never land flush against the edge of the visible grid.
 */
export function clampToTerrainFootprint(
  x: number,
  z: number,
  inset: number = 1,
): { x: number; z: number } {
  const { xMin, xMax, zMin, zMax } = TERRAIN_GROUND_PLANE_BOUNDS
  return {
    x: Math.min(xMax - inset, Math.max(xMin + inset, x)),
    z: Math.min(zMax - inset, Math.max(zMin + inset, z)),
  }
}
