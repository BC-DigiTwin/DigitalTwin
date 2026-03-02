import { useStore } from '../../store/useStore'
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
 * Each segment is a flat amber box sitting just above the terrain plane
 * so it's clearly distinct from both buildings and ground.
 */
export function PathwaysGroup() {
  const visible = useStore((s) => s.layers.pathways)

  return (
    <group name="PathwaysGroup" visible={visible}>
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
