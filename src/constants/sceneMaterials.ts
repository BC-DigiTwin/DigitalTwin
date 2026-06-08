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
  /** Square grid on façades (triplanar overlay in mesh-local space, rotates with the mesh). */
  showBuildingGrid: boolean
  buildingGridColor: string
  buildingGridOpacity: number
  /** Mesh-local spacing between parallel grid lines (often comparable to world meters for greybox assets). */
  buildingGridCellSize: number
}

/**
 * Default: light electric cyan, semi-transparent, emissive — similar to a digital
 * blueprint / X-ray HUD read. Surface grid on by default with a soft cyan grid
 * so first-time visitors match the shipped “Buildings” panel preset.
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
  showBuildingGrid: true,
  buildingGridColor: '#AAEDFF',
  buildingGridOpacity: 0.29,
  buildingGridCellSize: 5.5,
}

/** Default solid fill when “Solid selected building” is on (matches default surface grid lines). */
export const SELECTION_SOLID_BODY_COLOR_DEFAULT =
  BLUEPRINT_BUILDING_DEFAULTS.buildingGridColor

/** Default: solid selection has no rim/emissive glow until the user turns it on. */
export const SELECTION_SOLID_GLOW_DEFAULT = false

/** Material-only tuning for the terrain plane (footprint and grid spacing live in this file). */
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

/** Material tuning for the campus road network (`RoadsGroup`). */
export interface RoadMaterialSettings {
  color: string
  opacity: number
  doubleSide: boolean
  depthWrite: boolean
  /** Draw order vs terrain grid (-20) and buildings (0). Lower = drawn earlier (behind). */
  renderOrder: number
}

export const ROADS_MATERIAL_DEFAULTS: RoadMaterialSettings = {
  color: '#3d6b85',
  opacity: 0.92,
  doubleSide: true,
  depthWrite: true,
  renderOrder: -10,
}

/** `TerrainGroup` grid `lineSegments` draw order — roads must render after this. */
export const TERRAIN_GROUND_GRID_RENDER_ORDER = -20 as const

/** Minimum road `renderOrder` so filled surfaces always draw after the ground grid. */
export const ROADS_MIN_RENDER_ORDER = TERRAIN_GROUND_GRID_RENDER_ORDER + 1

/**
 * Fixed world-space rectangle for the campus ground plane (matched to greybox footprint).
 * West / East = X, South / North = Z.
 *
 * Tuned to campus model: width 680, depth 866, cell 5, offset (+95 X, −19 Z) from prior anchor.
 */
export const TERRAIN_GROUND_PLANE_BOUNDS = {
  xMin: -160.5,
  xMax: 519.5,
  zMin: -657.5,
  zMax: 208.5,
  positionY: 0,
} as const

/**
 * Campus center and ground rectangle (matches `TERRAIN_GROUND_PLANE_BOUNDS`).
 */
export const TERRAIN_GROUND_ANCHOR = (() => {
  const { xMin, xMax, zMin, zMax, positionY } = TERRAIN_GROUND_PLANE_BOUNDS
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2
  const width = Math.abs(xMax - xMin)
  const depth = Math.abs(zMax - zMin)
  return { cx, cz, positionY, width, depth } as const
})()

/**
 * Nudges the ground mesh slightly below building soles (world −Y).
 * Campus crease edges (`Line2`) sit on the footprint at ~y = 0; the opaque
 * ground plane at the exact same depth causes depth-buffer ties so some base
 * outlines vanish from steep views. A tiny separation makes outlines win the
 * depth test without relying on polygon offset (that applies to filled
 * triangles, not wide lines).
 */
export const TERRAIN_GROUND_PLANE_DEPTH_BIAS = 0.01 as const

/**
 * Grid line height in world Y (matches `TerrainGroup`:
 * `positionY - TERRAIN_GROUND_PLANE_DEPTH_BIAS + 0.001`).
 */
export const TERRAIN_GROUND_GRID_Y =
  TERRAIN_GROUND_PLANE_BOUNDS.positionY - TERRAIN_GROUND_PLANE_DEPTH_BIAS + 0.001

/**
 * Extra world-Y lift for road surfaces so they sit above the grid in the depth
 * buffer (avoids grid lines punching through on shallow camera angles).
 */
export const ROADS_ABOVE_GRID_EPS = 0.015

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

/**
 * How high (world units) the selected building floats above its base position.
 * Tuned in tandem with `BUILDING_FOCUS_ELEVATION_DEG` (CameraRig): the
 * selected building needs enough vertical separation that a shallow showcase
 * camera angle can keep neighboring rooftops out of the way.
 */
export const SELECTED_BUILDING_LIFT_AMOUNT = 26

/** Radians per second the selected building rotates around its local Y axis. */
export const SELECTED_BUILDING_SPIN_SPEED = 0.35

/**
 * `maath/easing` smooth-time (seconds) for the lift-up / lower-down move.
 *
 * Lower = snappier. ~0.2s gives a quick, responsive "pop up / drop down"
 * that still reads as an animation rather than a hard snap.
 */
export const SELECTED_BUILDING_LIFT_SMOOTH_TIME = 0.2

/**
 * Multipliers applied to an *unselected* building's appearance while another
 * building is selected — pushes the rest of the campus visually into the
 * background so the focused building reads as the hero.
 */
export const MUTED_INTERACTION_MULTIPLIERS = {
  bodyOpacity: 0.18,
  emissiveIntensity: 0.2,
  edgeOpacity: 0.28,
  gridOpacity: 0.18,
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
   * Falls back to `blueprint.opacity` when undefined.
   */
  bodyOpacity?: number
  /**
   * Optional `<Edges>` line opacity. When undefined, uses `blueprint.edgeOpacity`.
   */
  edgeOpacity?: number
  /**
   * Optional rim `uIntensity` cap (hover/selected only). When undefined, uses
   * the default from BuildingsGroup.
   */
  rimIntensity?: number
  /**
   * Multiplier on `blueprint.edgeLineWidth` for crease lines in this state.
   */
  edgeLineWidthScale?: number
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
    hex: '#7AE8F0',
    rgb: 'rgb(122, 232, 240)',
    bodyHex: '#5ED4E8',
    edgeHex: '#F0FDFF',
    bodyEmissiveIntensity: 1.25,
    bodyOpacity: 0.52,
    edgeOpacity: 1,
    rimIntensity: 3.2,
    edgeLineWidthScale: 1.12,
  },
  /** Stronger than default blueprint, still translucent so crease edges read. */
  SELECTED: {
    hex: '#D2F8FF',
    rgb: 'rgb(210, 248, 255)',
    bodyHex: '#5AD0EA',
    edgeHex: '#FFFFFF',
    bodyEmissiveIntensity: 1.42,
    bodyOpacity: 0.58,
    edgeOpacity: 1,
    rimIntensity: 2.95,
    edgeLineWidthScale: 1.58,
  },
} as const satisfies Record<InteractionState, InteractionStateColor>
