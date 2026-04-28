/**
 * Centralized color palette for placeholder materials.
 *
 * Each category gets a distinct hue so Buildings, Pathways, and Terrain
 * are immediately distinguishable in the viewport — even without real
 * textures or loaded models.
 */
export const PLACEHOLDER_COLORS = {
  buildings: '#5C6BC0', // indigo  — vertical structures
  pathways: '#FFB74D', // amber   — walkways / roads
  terrain: '#000000', // black   — ground plane fill (default)
} as const

export type PlaceholderCategory = keyof typeof PLACEHOLDER_COLORS

/** User-tunable holographic “blueprint” look for greybox campus buildings. */
export interface BlueprintBuildingMaterialSettings {
  color: string
  opacity: number
  emissiveIntensity: number
  doubleSide: boolean
  /** Crease / silhouette lines (`@react-three/drei` `<Edges>` / Line2) — separate tint from faces. */
  edgeColor: string
  edgeOpacity: number
  showEdges: boolean
  /** Degrees between face normals below which two faces are smoothed together (drei `<Edges>` / `EdgesGeometry`). Higher = fewer lines. */
  edgeThreshold: number
  /** World-axis square grid on façades (triplanar shader overlay). */
  showBuildingGrid: boolean
  buildingGridColor: string
  buildingGridOpacity: number
  /** World units between parallel grid lines (matches terrain spacing if desired). */
  buildingGridCellSize: number
}

/**
 * Default: light electric cyan, semi-transparent, emissive — similar to a digital
 * blueprint / X-ray HUD read (see product reference).
 */
export const BLUEPRINT_BUILDING_DEFAULTS: BlueprintBuildingMaterialSettings = {
  color: '#40D9FF',
  opacity: 0.4,
  emissiveIntensity: 0.8,
  doubleSide: true,
  edgeColor: '#E8FDFF',
  edgeOpacity: 1,
  showEdges: true,
  // Tuned for blueprint readability: keeps major silhouettes/creases while
  // suppressing noisy internal lines on mostly coplanar faces.
  edgeThreshold: 18,
  showBuildingGrid: false,
  buildingGridColor: '#5a8ca0',
  buildingGridOpacity: 0.45,
  buildingGridCellSize: 5,
}

/** Material-only tuning for the terrain plane (geometry/bounds are fixed below). */
export interface TerrainGroundMaterialSettings {
  color: string
  roughness: number
  metalness: number
}

export const TERRAIN_GROUND_DEFAULTS: TerrainGroundMaterialSettings = {
  color: PLACEHOLDER_COLORS.terrain,
  roughness: 0.92,
  metalness: 0,
}

/**
 * Fixed world-space rectangle for the campus ground plane (matched to greybox footprint).
 * West / East = X, South / North = Z.
 */
export const TERRAIN_GROUND_PLANE_BOUNDS = {
  xMin: -108,
  xMax: 128,
  zMin: -228,
  zMax: 78,
  positionY: 0,
} as const

/** World spacing between grid lines on the terrain plane (matches ground footprint). */
export const TERRAIN_GROUND_GRID_CELL_SIZE = 5

/** Line color for the terrain-aligned grid (subtle over grass). */
export const TERRAIN_GROUND_GRID_COLOR = '#3d5c6e'

/** WebGL clear / scene.background (digital-twin viewport). */
export const SCENE_BACKGROUND_DEFAULT = '#000000'

/** Defaults for rim light shader (Fresnel-edge glow and pulse). */
export const RIM_LIGHT_DEFAULTS = {
  uColor: '#00ffff',
  rimPower: 3,
  uIntensity: 1,
  uPulseSpeed: 2,
} as const
