import { mockBuildings } from '../../lib/mockDatabase'
import type { CampusBuilding } from '../store/useStore'

/**
 * UI label for a campus building id.
 *
 *   • `building_a` … `building_z` → `A Building` … `Z Building`
 *   • `building_garage` → `Parking Garage`
 *   • other ids → title-cased slug fallback
 */
export function campusBuildingLabel(id: string): string {
  if (id === 'building_garage') return 'Parking Garage'

  const letter = id.match(/^building_([a-z])$/i)
  if (letter) return `${letter[1].toUpperCase()} Building`

  return id
    .replace(/^building_/, '')
    .split('_')
    .map((part) =>
      part.length <= 1
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

/**
 * Single-letter glyph for the building picker menu (garage uses a full label instead).
 */
export function campusBuildingMenuGlyph(id: string): string {
  const letter = id.match(/^building_([a-z])$/i)
  if (letter) return letter[1].toUpperCase()

  const slug = id.replace(/^building_/, '')
  return slug ? slug.charAt(0).toUpperCase() : '?'
}

export function isParkingGarageBuilding(id: string): boolean {
  return id === 'building_garage'
}

/**
 * Ordered, de-duplicated list of every building the UI should offer: mock
 * rows first (stable order), then any additional buildings from the loaded model.
 */
export function buildKnownCampusBuildings(
  registry: readonly CampusBuilding[],
): CampusBuilding[] {
  const seen = new Set<string>()
  const out: CampusBuilding[] = []

  for (const b of mockBuildings) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    out.push({ id: b.id, name: campusBuildingLabel(b.id) })
  }

  const extras = registry
    .filter((b) => !seen.has(b.id))
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const b of extras) {
    seen.add(b.id)
    out.push({ id: b.id, name: campusBuildingLabel(b.id) })
  }

  return out
}
