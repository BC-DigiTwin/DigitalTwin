import { useStore } from '../../store/useStore'
import { PLACEHOLDER_COLORS } from '../../constants/sceneMaterials'

const COLOR = PLACEHOLDER_COLORS.buildings

/** [x, z, width, depth, height] for each placeholder building. */
const BUILDINGS: [number, number, number, number, number][] = [
  [-12, -8, 10, 8, 7],
  [6, -10, 8, 6, 10],
  [18, -4, 6, 10, 5],
  [-8, 10, 12, 6, 8],
  [10, 12, 7, 7, 12],
  [-20, 0, 6, 6, 6],
]

/**
 * Scene-graph group that will own every building / structure model.
 *
 * Visibility is driven by the global Zustand `layers.buildings` flag.
 * For now it renders colour-coded placeholder boxes so each future
 * building is identifiable in the viewport.  Replace with real GLB
 * models loaded via `useAssetLoader` as assets become available.
 */
export function BuildingsGroup() {
  const visible = useStore((s) => s.layers.buildings)

  return (
    <group name="BuildingsGroup" visible={visible}>
      {BUILDINGS.map(([x, z, w, d, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
      ))}
    </group>
  )
}
