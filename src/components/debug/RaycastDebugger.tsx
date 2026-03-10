import { useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useControls } from 'leva'
import { Vector3, type Mesh } from 'three'
import { useStore } from '../../store/useStore'

const _target = new Vector3()

/**
 * Visual debugger that renders a small sphere at the current raycast
 * intersection point.
 *
 * Because the Canvas raycaster is restricted to the INTERACTIVE layer,
 * the sphere only appears when the pointer hovers a building — it
 * disappears over terrain, pathways, and other non-interactive geometry,
 * confirming the layer filter is working.
 *
 * Gated behind `debugMode` and a Leva toggle so it has zero cost in
 * production / when disabled.
 */
export function RaycastDebugger() {
  const debugMode = useStore((s) => s.debugMode)

  const { Enabled: enabled } = useControls(
    'Raycast Debugger',
    { Enabled: { value: true } },
    { collapsed: true },
  )

  if (!debugMode || !enabled) return null
  return <RaycastSphere />
}

function RaycastSphere() {
  const sphereRef = useRef<Mesh>(null)
  const [visible, setVisible] = useState(false)
  const [hitName, setHitName] = useState('')
  const { scene, raycaster, pointer, camera } = useThree()

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(scene.children, true)

    if (hits.length > 0) {
      const hit = hits[0]
      if (sphereRef.current) {
        _target.copy(hit.point)
        sphereRef.current.position.lerp(_target, 0.5)
      }
      const name = hit.object.name || hit.object.parent?.name || '(unnamed)'
      if (name !== hitName) setHitName(name)
      if (!visible) setVisible(true)
    } else {
      if (visible) setVisible(false)
      if (hitName) setHitName('')
    }
  })

  useControls(
    'Raycast Debugger',
    { 'Hit Object': { value: hitName, editable: false } },
    { collapsed: true },
    [hitName],
  )

  return (
    <mesh ref={sphereRef} visible={visible}>
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshBasicMaterial color="#00ff88" depthTest={false} transparent opacity={0.8} />
    </mesh>
  )
}
