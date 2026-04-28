import { useRef } from 'react'
import type { Group } from 'three'
import { useStore } from '../../store/useStore'
import { useRenderLayer } from '../../hooks/useInteractiveLayer'
import { RENDER_LAYERS } from '../../constants/renderLayers'

/**
 * Stress test: renders 500+ meshes to verify r3f-perf and frame-loop
 * stability.  Visibility is driven by the global Zustand
 * `layers.stressTest` flag (off by default).
 *
 * Tagged with `RENDER_LAYERS.DEBUG` (layer 5) — the raycaster ignores it.
 * Mesh count is controlled from **Layer Visibility** when the stress layer is on.
 */
export function StressTestGroup() {
  const visible = useStore((s) => s.layers.stressTest)
  const count = useStore((s) => s.stressTestMeshCount)
  const groupRef = useRef<Group>(null)

  useRenderLayer(groupRef.current, RENDER_LAYERS.DEBUG)

  if (!visible) return null

  const side = Math.ceil(Math.sqrt(count))
  const meshes = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / side)
    const col = i % side
    const x = (col - side / 2) * 1.2
    const z = (row - side / 2) * 1.2
    return (
      <mesh key={i} position={[x, 0.5, z]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial
          color={`hsl(${(i * 37) % 360}, 60%, 50%)`}
          emissive={`hsl(${(i * 37) % 360}, 60%, 50%)`}
          emissiveIntensity={1}
        />
      </mesh>
    )
  })

  return <group ref={groupRef} name="StressTestGroup">{meshes}</group>
}
