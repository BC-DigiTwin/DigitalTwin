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
  terrain: '#66BB6A', // green   — grass / ground
} as const

export type PlaceholderCategory = keyof typeof PLACEHOLDER_COLORS

/** Defaults for rim light shader (Fresnel-edge glow). */
export const RIM_LIGHT_DEFAULTS = {
  rimColor: '#00ffff',
  rimPower: 3,
  rimIntensity: 1,
} as const
