import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { RimLightMaterial } from './RimLightMaterial'

const INSTANCE_COUNT = 5
const BOX_SIZE = 2

/**
 * Example: InstancedMesh with RimLightMaterial using instanceColor and instanceRimIntensity.
 * Toggle "Instanced Rim" in Layer Visibility to verify instancing + rim (issue 98).
 */
export function InstancedRimExample() {
  const visible = useStore((s) => s.layers.instancedRim)
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE)
    const rimIntensity = new Float32Array(INSTANCE_COUNT)
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      rimIntensity[i] = i === 2 ? 1 : 0
    }
    g.setAttribute(
      'instanceRimIntensity',
      new THREE.InstancedBufferAttribute(rimIntensity, 1)
    )
    return g
  }, [])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || typeof mesh.setMatrixAt !== 'function') return

    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(INSTANCE_COUNT * 3),
      3
    )

    const temp = new THREE.Object3D()
    const colors = [
      new THREE.Color(0.9, 0.9, 0.9),
      new THREE.Color(0.85, 0.9, 1.0),
      new THREE.Color(1.0, 0.9, 0.85),
      new THREE.Color(0.9, 1.0, 0.9),
      new THREE.Color(1.0, 0.85, 0.9),
    ]

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      temp.position.set((i - (INSTANCE_COUNT - 1) / 2) * (BOX_SIZE + 1), 1, 0)
      temp.updateMatrix()
      mesh.setMatrixAt(i, temp.matrix)
      mesh.setColorAt(i, colors[i])
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
  }, [])

  if (!visible) return null

  return (
    <group name="InstancedRimExample" position={[20, 0, 0]}>
      <instancedMesh
        ref={meshRef}
        args={[geometry, undefined, INSTANCE_COUNT]}
        castShadow
        receiveShadow
      >
        <RimLightMaterial
          color="#888888"
          emissive="#888888"
          emissiveIntensity={1}
          uColor="#00ffff"
          uIntensity={0}
          useInstanceRimIntensity
        />
      </instancedMesh>
    </group>
  )
}
