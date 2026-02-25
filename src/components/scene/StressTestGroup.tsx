import { useControls } from 'leva'
import { useStore } from '../../store/useStore'

/**
 * Stress test: renders 500+ meshes to verify r3f-perf and frame-loop
 * stability.  Visibility is driven by the global Zustand
 * `layers.stressTest` flag (off by default).
 *
 * Mesh count is tuneable via Leva while the layer is visible.
 */
export function StressTestGroup() {
  const visible = useStore((s) => s.layers.stressTest)

  const { count } = useControls(
    'Stress Test',
    {
      count: {
        value: 600,
        min: 500,
        max: 1200,
        step: 100,
        label: 'Mesh count',
      },
    },
    { collapsed: true },
  )

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
        <meshStandardMaterial color={`hsl(${(i * 37) % 360}, 60%, 50%)`} />
      </mesh>
    )
  })

  return <group name="StressTestGroup">{meshes}</group>
}
