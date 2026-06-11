import type { Object3D } from 'three'

/**
 * Blender auto-renames duplicated objects (`building_e` → `building_e.001`).
 * GLTF / loaders often turn that into `building_e_001` or `building_e_2`.
 *
 * Returns a stable id for API / UI when the name matches that pattern.
 * Other names (e.g. `building_science`, `floor_2`) are returned unchanged.
 */
export function canonicalBuildingMeshName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return name

  // Blender collections often export as `buildings_*`; RDS / API ids use `building_*`.
  const normalized = trimmed.replace(/^buildings_/i, 'building_')

  if (/^building_[a-zA-Z0-9]+_\d+$/.test(normalized)) {
    return normalized.replace(/_\d+$/, '')
  }

  if (/^building_[a-zA-Z0-9]+\.\d+$/.test(normalized)) {
    return normalized.replace(/\.\d+$/, '')
  }

  return normalized
}

/** Human / API label from a Blender object name, with fallback when empty. */
export function buildingDisplayName(raw: string | undefined | null, fallback: string): string {
  const t = String(raw ?? '').trim()
  if (!t) return fallback
  return canonicalBuildingMeshName(t)
}

const API_BUILDING_ID = /^building_[a-zA-Z0-9_]+$/

/**
 * Use a canonical `building_*` object name as the stable id for selection and
 * `GET /api/buildings/:id`. Otherwise fall back to Three's uuid (no API row).
 */
export function stableBuildingId(node: Object3D): string {
  const raw = node.name?.trim() ?? ''
  if (!raw) return node.uuid
  const canonical = canonicalBuildingMeshName(raw)
  if (API_BUILDING_ID.test(canonical)) return canonical
  return node.uuid
}
