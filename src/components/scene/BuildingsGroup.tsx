/**
 * Scene-graph group that will own every building / structure model.
 *
 * For now it renders a placeholder box so the layer is visible in the
 * scene graph.  Replace with real GLB models loaded via `useAssetLoader`
 * as assets become available.
 */
export function BuildingsGroup() {
  return (
    <group name="BuildingsGroup">
      {/* Placeholder — swap for loaded campus model */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="mediumpurple" />
      </mesh>
    </group>
  )
}
