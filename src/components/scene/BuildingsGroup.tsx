import { useStore } from '../../store/useStore'

/**
 * Scene-graph group that will own every building / structure model.
 *
 * Visibility is driven by the global Zustand `layers.buildings` flag.
 * For now it renders a placeholder box so the layer is visible in the
 * scene graph.  Replace with real GLB models loaded via `useAssetLoader`
 * as assets become available.
 */
export function BuildingsGroup() {
  const visible = useStore((s) => s.layers.buildings)

  return (
    <group name="BuildingsGroup" visible={visible}>
      {/* Placeholder — swap for loaded campus model */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="mediumpurple" />
      </mesh>
    </group>
  )
}
