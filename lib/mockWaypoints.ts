/**
 * Campus waypoint data — wayfinding pins for stairs, bathrooms, entrances, etc.
 *
 * Each waypoint is positioned in world space (X/Z; Y is snapped to terrain at
 * render time). `buildingId` is the optional GLB slug from `mockDatabase.ts`
 * (`building_a` … `building_e`) so the UI can group waypoints by building.
 *
 * IDs are stable strings — once a waypoint is saved (either here as seed data
 * or in `localStorage` from in-app placement), refresh keeps the same id.
 */

export const WAYPOINT_CATEGORIES = ['entrance', 'stairs', 'bathroom'] as const
export type WaypointCategory = (typeof WAYPOINT_CATEGORIES)[number]

export interface CategoryMeta {
  /** Display label (sentence case). */
  label: string
  /** Plural display label for headings. */
  pluralLabel: string
  /** Distinct hex tint used by ring / beam / icon for this category. */
  color: `#${string}`
  /** Description used in tooltips / aria labels. */
  description: string
}

/**
 * Category-specific visual + textual metadata. Marker color, icon, and panel
 * label all draw from here so a single edit changes them everywhere.
 */
export const WAYPOINT_CATEGORY_META: Record<WaypointCategory, CategoryMeta> = {
  entrance: {
    label: 'Entrance',
    pluralLabel: 'Entrances',
    color: '#7CF5C2',
    description: 'Building entrance or exterior door',
  },
  stairs: {
    label: 'Stairs',
    pluralLabel: 'Stairs',
    color: '#F5B85C',
    description: 'Stairwell access',
  },
  bathroom: {
    label: 'Bathroom',
    pluralLabel: 'Bathrooms',
    color: '#9DB7FF',
    description: 'Restroom / bathroom',
  },
}

export interface Waypoint {
  id: string
  category: WaypointCategory
  /** Optional human label (defaults to category if blank). */
  label?: string
  /** World-space X. */
  x: number
  /** World-space Z. */
  z: number
  /**
   * Building id (`building_a` … `building_e`) this waypoint is associated
   * with for list grouping. `null` means unassigned (e.g. courtyard).
   */
  buildingId: string | null
}

/**
 * Default seed waypoints. Coordinates are approximate ground positions inside
 * the campus footprint (see `TERRAIN_GROUND_PLANE_BOUNDS`: x [-108, 128], z
 * [-228, 78]). These are loaded only when no waypoints exist in localStorage.
 */
export const INITIAL_WAYPOINTS: Waypoint[] = [
  {
    id: 'wp_a_entrance',
    category: 'entrance',
    label: 'Building A — Main Entrance',
    x: -32,
    z: 14,
    buildingId: 'building_a',
  },
  {
    id: 'wp_a_stairs_north',
    category: 'stairs',
    label: 'Building A — North Stairs',
    x: -24,
    z: 28,
    buildingId: 'building_a',
  },
  {
    id: 'wp_b_entrance',
    category: 'entrance',
    label: 'Building B — Main Entrance',
    x: 18,
    z: -20,
    buildingId: 'building_b',
  },
  {
    id: 'wp_b_bathroom',
    category: 'bathroom',
    label: 'Building B — Public Restroom',
    x: 26,
    z: -8,
    buildingId: 'building_b',
  },
  {
    id: 'wp_c_entrance',
    category: 'entrance',
    label: 'Building C — Health Sciences Entrance',
    x: 64,
    z: -60,
    buildingId: 'building_c',
  },
  {
    id: 'wp_c_stairs',
    category: 'stairs',
    label: 'Building C — Stairs',
    x: 72,
    z: -52,
    buildingId: 'building_c',
  },
  {
    id: 'wp_d_entrance',
    category: 'entrance',
    label: 'Building D — Main Entrance',
    x: 4,
    z: -110,
    buildingId: 'building_d',
  },
  {
    id: 'wp_d_bathroom',
    category: 'bathroom',
    label: 'Building D — Restroom',
    x: 14,
    z: -98,
    buildingId: 'building_d',
  },
  {
    id: 'wp_e_entrance',
    category: 'entrance',
    label: 'Building E — Student Services Entrance',
    x: -56,
    z: -160,
    buildingId: 'building_e',
  },
  {
    id: 'wp_quad_bathroom',
    category: 'bathroom',
    label: 'Courtyard Restroom',
    x: -8,
    z: -40,
    buildingId: null,
  },
]

/* ── Dummy generation from building footprints ───────────────────────── */

/**
 * Minimal building shape the generator needs. Mirrors the optional footprint
 * fields published on `CampusBuilding` by `BuildingsGroup`. Declared locally so
 * this module stays free of a `src/store` import (which would be circular).
 */
export interface BuildingFootprintInput {
  id: string
  name: string
  /** World-space footprint center X. */
  cx?: number
  /** World-space footprint center Z. */
  cz?: number
  /** Footprint half-width along X. */
  halfX?: number
  /** Footprint half-depth along Z. */
  halfZ?: number
}

/**
 * Placement offsets per category, expressed as fractions of the building's
 * half-extents so points always fall *inside* the footprint regardless of
 * building size. (dx, dz) ∈ roughly [-0.5, 0.7].
 */
const DUMMY_WAYPOINT_SPECS: ReadonlyArray<{
  category: WaypointCategory
  dx: number
  dz: number
  suffix: string
}> = [
  { category: 'entrance', dx: 0, dz: 0.72, suffix: 'Main Entrance' },
  { category: 'stairs', dx: 0.34, dz: -0.18, suffix: 'Stairs' },
  { category: 'bathroom', dx: -0.4, dz: -0.36, suffix: 'Restroom' },
]

/**
 * Builds a representative set of dummy waypoints (entrance + stairs + bathroom)
 * positioned inside each building's measured footprint. Buildings missing
 * footprint data (not yet measured) are skipped. IDs are stable per building +
 * category, so regenerating overwrites cleanly instead of duplicating.
 */
export function generateDummyWaypointsForBuildings(
  buildings: readonly BuildingFootprintInput[],
): Waypoint[] {
  const out: Waypoint[] = []
  for (const b of buildings) {
    if (
      b.cx === undefined ||
      b.cz === undefined ||
      b.halfX === undefined ||
      b.halfZ === undefined
    ) {
      continue
    }
    const hx = Math.max(0, b.halfX)
    const hz = Math.max(0, b.halfZ)
    for (const spec of DUMMY_WAYPOINT_SPECS) {
      out.push({
        id: `wp_${b.id}_${spec.category}`,
        category: spec.category,
        label: `${b.name} — ${spec.suffix}`,
        x: Number((b.cx + spec.dx * hx).toFixed(3)),
        z: Number((b.cz + spec.dz * hz).toFixed(3)),
        buildingId: b.id,
      })
    }
  }
  return out
}

/* ── Persistence ─────────────────────────────────────────────────────── */

const STORAGE_KEY = 'digital-twin/waypoints/v1'

/**
 * Pull a stored waypoint list out of `localStorage`. Returns `null` when:
 *   • no entry exists (first run after install),
 *   • the entry fails JSON parse,
 *   • the entry doesn't match the `Waypoint[]` shape (e.g. older revision).
 *
 * Callers should fall back to `INITIAL_WAYPOINTS` in that case.
 */
export function loadStoredWaypoints(): Waypoint[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const valid = parsed.filter(isWaypoint)
    if (valid.length === 0) return null
    return valid
  } catch {
    return null
  }
}

/** Best-effort `localStorage.setItem`. Failures (quota, private mode) are swallowed. */
export function saveWaypointsToStorage(list: readonly Waypoint[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* localStorage may be unavailable; non-fatal. */
  }
}

function isWaypoint(value: unknown): value is Waypoint {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.x === 'number' &&
    typeof v.z === 'number' &&
    typeof v.category === 'string' &&
    (WAYPOINT_CATEGORIES as readonly string[]).includes(v.category) &&
    (v.buildingId === null || typeof v.buildingId === 'string') &&
    (v.label === undefined || typeof v.label === 'string')
  )
}

/* ── ID generation ───────────────────────────────────────────────────── */

/**
 * Stable ID for a new in-app waypoint. Prefix encodes category for log
 * readability; the unique suffix is six lowercase hex characters from
 * `crypto.getRandomValues` (or `Math.random` fallback). Collision odds for
 * realistic campus sizes (<10⁴ waypoints) are well below 1%.
 */
export function generateWaypointId(category: WaypointCategory): string {
  const suffix = randomHex6()
  return `wp_${category}_${suffix}`
}

function randomHex6(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(3)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')
}

/* ── Export to source-code snippet ───────────────────────────────────── */

/**
 * Serialize a waypoint list into a TypeScript fragment the user can paste
 * back into `INITIAL_WAYPOINTS` to promote in-app edits to seed data.
 * Pure formatter — no I/O.
 */
export function exportWaypointsAsTsSnippet(list: readonly Waypoint[]): string {
  const rows = list
    .map((wp) => {
      const labelPart =
        wp.label !== undefined ? `    label: ${JSON.stringify(wp.label)},\n` : ''
      const buildingIdPart =
        wp.buildingId === null
          ? '    buildingId: null,'
          : `    buildingId: ${JSON.stringify(wp.buildingId)},`
      return [
        '  {',
        `    id: ${JSON.stringify(wp.id)},`,
        `    category: ${JSON.stringify(wp.category)},`,
        labelPart.trimEnd(),
        `    x: ${formatCoord(wp.x)},`,
        `    z: ${formatCoord(wp.z)},`,
        buildingIdPart,
        '  },',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  return `export const INITIAL_WAYPOINTS: Waypoint[] = [\n${rows}\n]\n`
}

function formatCoord(n: number): string {
  return Number.isFinite(n) ? Number(n.toFixed(3)).toString() : '0'
}
