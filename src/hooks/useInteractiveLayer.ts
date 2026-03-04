import { useEffect } from 'react'
import type { Object3D } from 'three'
import { RENDER_LAYERS, type RenderLayer } from '../constants/renderLayers'

/**
 * Enables a Three.js bitmask layer on an Object3D and all its
 * descendants.  Objects keep layer 0 (DEFAULT) for normal rendering —
 * `layers.enable` adds the bit without removing existing ones.
 *
 * @param object  Root of the subtree to tag (e.g. a loaded GLB scene).
 * @param layer   Index from `RENDER_LAYERS`.
 */
export function useRenderLayer(
  object: Object3D | null | undefined,
  layer: RenderLayer,
) {
  useEffect(() => {
    if (!object) return
    object.traverse((child) => {
      child.layers.enable(layer)
    })
  }, [object, layer])
}

/**
 * Convenience wrapper — enables `RENDER_LAYERS.INTERACTIVE` so the
 * raycaster can hit-test the subtree.
 */
export function useInteractiveLayer(object: Object3D | null | undefined) {
  useRenderLayer(object, RENDER_LAYERS.INTERACTIVE)
}
