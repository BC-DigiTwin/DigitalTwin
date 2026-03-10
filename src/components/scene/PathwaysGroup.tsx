import { useRef } from 'react'
import type { Group } from 'three'
import { useStore } from '../../store/useStore'
import { useRenderLayer } from '../../hooks/useInteractiveLayer'
import { RENDER_LAYERS } from '../../constants/renderLayers'
import { PLACEHOLDER_COLORS } from '../../constants/sceneMaterials'

const COLOR = PLACEHOLDER_COLORS.pathways
const PATH_HEIGHT = 0.08

/** [x, z, width, depth] for each placeholder pathway segment. */
const PATHWAYS: [number, number, number, number][] = [
  [0, 0, 40, 2],       // main east-west spine
  [0, 0, 2, 30],       // main north-south spine
  [-12, 0, 2, 16],     // west spur
  [14, -7, 10, 2],     // east connector
  [5, 12, 12, 2],      // north-east branch
]

/**
 * Scene-graph group for walkways, roads, and pathway placeholders.
 *
 * Visibility is driven by the global Zustand `layers.pathways` flag.
 * Tagged with `RENDER_LAYERS.PATHWAYS` (layer 4) — the raycaster
 * ignores it.
 */
export function PathwaysGroup() {
  const visible = useStore((s) => s.layers.pathways)
  const groupRef = useRef<Group>(null)

  useRenderLayer(groupRef.current, RENDER_LAYERS.PATHWAYS)

  return (
    <group ref={groupRef} name="PathwaysGroup" visible={visible}>
      {PATHWAYS.map(([x, z, w, d], i) => (
        <mesh
          key={i}
          position={[x, PATH_HEIGHT / 2, z]}
          receiveShadow
        >
          <boxGeometry args={[w, PATH_HEIGHT, d]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
      ))}
    </group>
  )
}
