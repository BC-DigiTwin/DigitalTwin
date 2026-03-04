import { useState, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { useAssetLoader } from '../../hooks/useAssetLoader'
import { gpsToWorldPosition } from '../../utils/gps'
import { setPointerCursor } from '../../utils/pointerCursor'
import { WORLD_ORIGIN } from '../../constants/coordinates'
import { RimLightMaterial } from './RimLightMaterial'

/** Public path to the campus greybox GLB (World Origin = scene anchor). */
export const CAMPUS_GLB_PATH = '/models/campus_greybox.glb'

// Preload so Suspense can resolve when BuildingsGroup mounts
useAssetLoader.preload(CAMPUS_GLB_PATH)

const RIM_GLOW_COLOR = '#00ffff'

function getMaterialColor(material: THREE.Material | THREE.Material[]): string | number {
  const mat = Array.isArray(material) ? material[0] : material
  if (mat && 'color' in mat && mat.color instanceof THREE.Color) {
    return mat.color.getStyle()
  }
  return '#888888'
}

interface SceneNodeProps {
  node: THREE.Object3D
  hoveredBuildingId: string | null
  setHoveredBuildingId: (id: string | null) => void
  /** UUID of the parent group that represents this building (walls + roof share this). */
  buildingId: string | null
}

/**
 * Recursively renders GLB scene nodes. Groups pass their uuid as buildingId so
 * all meshes under the same group (e.g. walls + roof) share one hover: when any
 * part is hovered, the whole building glows.
 */
function SceneNode({
  node,
  hoveredBuildingId,
  setHoveredBuildingId,
  buildingId: parentBuildingId,
}: SceneNodeProps) {
  if (node.type === 'Mesh') {
    const mesh = node as THREE.Mesh
    const id = mesh.uuid
    const buildingId = parentBuildingId ?? id
    const isHovered = hoveredBuildingId === buildingId

    return (
      <mesh
        key={id}
        geometry={mesh.geometry}
        position={mesh.position.clone()}
        quaternion={mesh.quaternion.clone()}
        scale={mesh.scale.clone()}
        castShadow
        receiveShadow
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setPointerCursor(true)
          setHoveredBuildingId(buildingId)
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setPointerCursor(false)
          setHoveredBuildingId(null)
        }}
      >
        <RimLightMaterial
          color={getMaterialColor(mesh.material)}
          uColor={RIM_GLOW_COLOR}
          uIntensity={isHovered ? 1 : 0}
        />
      </mesh>
    )
  }

  const obj = node as THREE.Object3D
  const thisGroupId = node.uuid
  return (
    <group
      key={node.uuid}
      position={node.position.clone()}
      quaternion={node.quaternion.clone()}
      scale={node.scale.clone()}
    >
      {obj.children.map((child) => (
        <SceneNode
          key={child.uuid}
          node={child}
          hoveredBuildingId={hoveredBuildingId}
          setHoveredBuildingId={setHoveredBuildingId}
          buildingId={thisGroupId}
        />
      ))}
    </group>
  )
}

/**
 * Scene-graph group that owns all building / structure content.
 *
 * Renders the campus greybox GLB at World Origin (anchor-based positioning
 * per gpsToWorldPosition + WORLD_ORIGIN). Each mesh in the GLB is rendered
 * with RimLightMaterial and pointer events so hovering a building creates
 * the rim glow (issues 96–97: rim light shader, uColor/uIntensity uniforms).
 * Visibility is driven by the global Zustand `layers.buildings` flag.
 */
export function BuildingsGroup() {
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null)
  const visible = useStore((s) => s.layers.buildings)
  const gltf = useAssetLoader(CAMPUS_GLB_PATH)

  const position = gpsToWorldPosition(WORLD_ORIGIN.lat, WORLD_ORIGIN.lon)

  const scene = useMemo(() => gltf.scene, [gltf.scene])

  return (
    <group name="BuildingsGroup" visible={visible} position={position}>
      {scene.children.map((child) => (
        <SceneNode
          key={child.uuid}
          node={child}
          hoveredBuildingId={hoveredBuildingId}
          setHoveredBuildingId={setHoveredBuildingId}
          buildingId={null}
        />
      ))}
    </group>
  )
}
