import { useRef } from 'react'
import type { Group } from 'three'
import { useStore } from '../../store/useStore'
import { useRenderLayer } from '../../hooks/useInteractiveLayer'
import { RENDER_LAYERS } from '../../constants/renderLayers'
import { PLACEHOLDER_COLORS } from '../../constants/sceneMaterials'

const COLOR = PLACEHOLDER_COLORS.terrain
const GROUND_SIZE = 120

/**
 * Scene-graph group for terrain / ground-plane placeholders.
 *
 * Visibility is driven by the global Zustand `layers.terrain` flag.
 * Tagged with `RENDER_LAYERS.TERRAIN` (layer 3) — the raycaster
 * ignores it.
 */
export function TerrainGroup() {
  const visible = useStore((s) => s.layers.terrain)
  const groupRef = useRef<Group>(null)

  useRenderLayer(groupRef.current, RENDER_LAYERS.TERRAIN)

  return (
    <group ref={groupRef} name="TerrainGroup" visible={visible}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={COLOR} />
      </mesh>
    </group>
  )
}
