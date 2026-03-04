/**
 * Three.js bitmask layer indices used to partition the scene graph.
 *
 * Every object lives on Layer 0 (DEFAULT) so the camera always renders
 * it.  Additional layers classify objects by purpose:
 *
 *   Layer 0 — DEFAULT        Camera renders everything on this layer.
 *   Layer 1 — INTERACTIVE    Raycaster-only.  Buildings and other
 *                             clickable / hoverable objects.
 *   Layer 2 — ENVIRONMENT    Grid, axes, sky — non-interactive scenery.
 *   Layer 3 — TERRAIN        Ground plane.
 *   Layer 4 — PATHWAYS       Walkways / roads.
 *   Layer 5 — DEBUG          Stress test, helper meshes, perf overlays.
 *
 * The Canvas raycaster is set to test Layer 1 only, so pointer events
 * skip everything except INTERACTIVE geometry.
 */
export const RENDER_LAYERS = {
  DEFAULT: 0,
  INTERACTIVE: 1,
  ENVIRONMENT: 2,
  TERRAIN: 3,
  PATHWAYS: 4,
  DEBUG: 5,
} as const

export type RenderLayer = (typeof RENDER_LAYERS)[keyof typeof RENDER_LAYERS]
