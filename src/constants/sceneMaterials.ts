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
  /** Screen-space edge thickness in pixels (`<Edges linewidth={...}>`). */
  edgeLineWidth: number
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
  // Bright white for maximum contrast against cyan translucent building faces.
  edgeColor: '#FFFFFF',
  edgeOpacity: 1,
  edgeLineWidth: 2.25,
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

/** Canonical interaction states used for mesh highlighting. */
export const INTERACTION_STATES = ['BASE', 'HOVER', 'SELECTED'] as const

export type InteractionState = (typeof INTERACTION_STATES)[number]

export interface InteractionStateColor {
  /** Rim glow color (Fresnel edge highlight added by RimLightMaterial). */
  hex: `#${string}`
  rgb: `rgb(${number}, ${number}, ${number})`
  /**
   * Optional override for the building's mesh body color (the diffuse
   * `material.color`). When `undefined`, body falls back to the user-tunable
   * `blueprint.color`. Set on HOVER/SELECTED to tint the entire mesh.
   */
  bodyHex?: `#${string}`
  /**
   * Optional override for the building's `<Edges>` linework color when this
   * state is active. When `undefined`, edges fall back to the user-tunable
   * `blueprint.edgeColor`. Used by SELECTED to make the active building's
   * outlines pop visibly above the rest of the campus.
   */
  edgeHex?: `#${string}`
  /**
   * Optional `material.emissiveIntensity` for this state. Higher = more glow.
   * Falls back to `blueprint.emissiveIntensity` when undefined.
   */
  bodyEmissiveIntensity?: number
  /**
   * Optional `material.opacity` for this state (0..1). Higher = more solid.
   * Falls back to `blueprint.opacity` when undefined. SELECTED uses 1 to
   * make the active building punch through the campus.
   */
  bodyOpacity?: number
}

/**
 * Single source of truth for interaction-state colors.
 * Keep HEX and RGB variants aligned so shader/DOM usage stays consistent.
 */
export const INTERACTION_STATE_COLORS = {
  BASE: {
    hex: '#40D9FF',
    rgb: 'rgb(64, 217, 255)',
  },
  HOVER: {
    hex: '#67F0D9',
    rgb: 'rgb(103, 240, 217)',
    bodyHex: '#67F0D9',
    bodyEmissiveIntensity: 1.8,
    bodyOpacity: 0.75,
  },
  SELECTED: {
    hex: '#FFC857',
    rgb: 'rgb(255, 200, 87)',
    bodyHex: '#FFC857',
    edgeHex: '#FFFFFF',
    bodyEmissiveIntensity: 3,
    bodyOpacity: 1,
  },
} as const satisfies Record<InteractionState, InteractionStateColor>
