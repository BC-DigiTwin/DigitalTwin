import { useStore } from '../../store/useStore'
import { PLACEHOLDER_COLORS } from '../../constants/sceneMaterials'

const COLOR = PLACEHOLDER_COLORS.terrain
const GROUND_SIZE = 120

/**
 * Scene-graph group for terrain / ground-plane placeholders.
 *
 * Visibility is driven by the global Zustand `layers.terrain` flag.
 * Renders a large flat plane at y=0 coloured green so it reads as
 * grass / open ground beneath the building and pathway layers.
 */
export function TerrainGroup() {
  const visible = useStore((s) => s.layers.terrain)

  return (
    <group name="TerrainGroup" visible={visible}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={COLOR} />
      </mesh>
    </group>
  )
}
