/**
 * Campus waypoint data — wayfinding pins for accessibility, elevators,
 * restrooms, emergency phones, parking, etc.
 *
 * Each waypoint is positioned in world space (X/Z; Y is snapped to terrain at
 * render time). `buildingId` is the optional GLB slug from `mockDatabase.ts`
 * (`building_a` … `building_e`) so the UI can group waypoints by building.
 *
 * Restrooms mirror the campus map legend's two distinct entries — "Restroom
 * (All Gender)" and "Restroom (Public)" — as separate, individually filterable
 * categories.
 *
 * IDs are stable strings — once a waypoint is saved (either here as seed data
 * or in `localStorage` from in-app placement), refresh keeps the same id.
 */

export const WAYPOINT_CATEGORIES = [
  'accessibility',
  'elevator',
  'restroomAllGender',
  'restroomPublic',
  'emergencyPhone',
  'parking',
] as const
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
  accessibility: {
    label: 'Accessibility',
    pluralLabel: 'Accessibility',
    color: '#4FA3FF',
    description: 'Accessible (ADA) access point',
  },
  elevator: {
    label: 'Elevator',
    pluralLabel: 'Elevators',
    color: '#F5B85C',
    description: 'Elevator access',
  },
  restroomAllGender: {
    label: 'Restroom (All Gender)',
    pluralLabel: 'Restrooms (All Gender)',
    color: '#9DB7FF',
    description: 'All-gender restroom',
  },
  restroomPublic: {
    label: 'Restroom (Public)',
    pluralLabel: 'Restrooms (Public)',
    color: '#6FD9C6',
    description: 'Public restroom',
  },
  emergencyPhone: {
    label: 'Emergency Phone',
    pluralLabel: 'Emergency Phones',
    color: '#FF6B6B',
    description: 'Emergency phone',
  },
  parking: {
    label: 'Parking',
    pluralLabel: 'Parking',
    color: '#C792FF',
    description: 'Parking',
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
 * Default seed waypoints — hand-placed campus pins promoted from in-app export.
 * Re-exported from `initialWaypoints.ts` so the large list stays in its own
 * file. Loaded when no waypoints exist in localStorage (first run / fresh
 * clone). Commit + push this file so teammates get the same pins.
 */
export { INITIAL_WAYPOINTS } from './initialWaypoints'

/* ── Persistence ─────────────────────────────────────────────────────── */

// v5: promoted hand-placed waypoints to repo seed data. Bumping the key
// ignores stale browser-only v4 data so everyone loads INITIAL_WAYPOINTS.
const STORAGE_KEY = 'digital-twin/waypoints/v5'

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
