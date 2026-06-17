import { useMemo, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useAssetLoader } from '../../hooks/useAssetLoader'
import { useStore, type CameraViewMode } from '../../store/useStore'
import { gpsToWorldPosition } from '../../utils/gps'
import { WORLD_ORIGIN } from '../../constants/coordinates'
import {
  type RoadMaterialSettings,
  ROADS_ABOVE_GRID_EPS,
  ROADS_MAP_VIEW_COLOR,
  ROADS_MIN_RENDER_ORDER,
} from '../../constants/sceneMaterials'
import { RENDER_LAYERS } from '../../constants/renderLayers'

/** Public path to the campus road network GLB (same World Origin anchor as buildings). */
export const CAMPUS_ROADS_GLB_PATH = '/models/campus_roads.glb'

/** Blender object / mesh name for the road network in `campus_roads.glb`. */
const ROADS_OBJECT_NAME = 'terrain_roads'

useAssetLoader.preload(CAMPUS_ROADS_GLB_PATH)

const _bakedColor = new THREE.Color()

/** Bakes opacity into RGB so overlaps do not stack alpha (see `TerrainGroup` grid lines). */
function bakeRoadDisplayColor(
  settings: Pick<RoadMaterialSettings, 'color' | 'opacity'>,
): THREE.Color {
  _bakedColor.set(settings.color)
  if (settings.opacity < 1) {
    _bakedColor.multiplyScalar(settings.opacity)
  }
  return _bakedColor.clone()
}

function roadViewBaseColor(
  material: RoadMaterialSettings,
  cameraMode: CameraViewMode,
): string {
  return cameraMode === 'map' ? ROADS_MAP_VIEW_COLOR : material.color
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function matchesRoadsName(name: string): string {
  return normalizeName(name) === ROADS_OBJECT_NAME
}

function vertexCount(geometry: THREE.BufferGeometry | undefined): number {
  return geometry?.attributes?.position?.count ?? 0
}

function meshHasTriangleFaces(geometry: THREE.BufferGeometry): boolean {
  if (geometry.index && geometry.index.count > 0) return true
  const groups = geometry.groups
  if (groups.length > 0) {
    return groups.some((g) => g.count >= 3)
  }
  const pos = geometry.attributes.position
  if (!pos) return false
  return pos.count >= 3 && pos.count % 3 === 0
}

function countVerts(root: THREE.Object3D): number {
  let total = 0
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      total += vertexCount((obj as THREE.Mesh).geometry)
      return
    }
    if ((obj as THREE.LineSegments).isLineSegments || (obj as THREE.Line).isLine) {
      total += vertexCount((obj as THREE.Line).geometry)
    }
  })
  return total
}

/**
 * Finds `terrain_roads` (any Object3D type), clones its subtree, and returns it
 * for declarative R3F rendering. Returns null when the GLB has no renderable geometry.
 */
export function prepareRoadsScene(root: THREE.Object3D): THREE.Object3D | null {
  let anchor: THREE.Object3D | null = null

  root.traverse((obj) => {
    if (!anchor && matchesRoadsName(obj.name)) {
      anchor = obj
    }
  })

  if (!anchor) {
    console.warn(
      `[RoadsGroup] no object named "${ROADS_OBJECT_NAME}" found in ${CAMPUS_ROADS_GLB_PATH}`,
    )
    return null
  }

  const prepared = (anchor as THREE.Object3D).clone(true)
  const totalVerts = countVerts(prepared)

  if (totalVerts === 0) {
    console.warn(
      [
        `[RoadsGroup] "${ROADS_OBJECT_NAME}" exists in ${CAMPUS_ROADS_GLB_PATH} but contains 0 vertices.`,
        'Blender likely exported edge-only geometry with no faces (the glTF file is only a transform node).',
        'Fix in Blender: select terrain_roads → Edit Mode → select all → Mesh → Fill (or add a Solidify modifier) → re-export .glb.',
      ].join(' '),
    )
    return null
  }

  return prepared
}

function RoadMeshNode({
  mesh,
  material,
  displayColorRef,
}: {
  mesh: THREE.Mesh
  material: RoadMaterialSettings
  displayColorRef: RefObject<THREE.Color>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useLayoutEffect(() => {
    const m = meshRef.current
    if (!m) return
    m.raycast = () => undefined
    m.layers.enable(RENDER_LAYERS.PATHWAYS)
  }, [])

  useLayoutEffect(() => {
    const mat = materialRef.current
    const displayColor = displayColorRef.current
    if (!mat || !displayColor) return
    mat.color.copy(displayColor)
  })

  useFrame(() => {
    const mat = materialRef.current
    const displayColor = displayColorRef.current
    if (!mat || !displayColor) return
    mat.color.copy(displayColor)
  })

  if (!meshHasTriangleFaces(mesh.geometry) || vertexCount(mesh.geometry) === 0) {
    return null
  }

  const renderOrder = Math.max(material.renderOrder, ROADS_MIN_RENDER_ORDER)

  return (
    <mesh
      ref={meshRef}
      geometry={mesh.geometry}
      position={mesh.position}
      quaternion={mesh.quaternion}
      scale={mesh.scale}
      renderOrder={renderOrder}
    >
      <meshBasicMaterial
        ref={materialRef}
        transparent={false}
        opacity={1}
        side={material.doubleSide ? THREE.DoubleSide : THREE.FrontSide}
        depthTest
        depthWrite={material.depthWrite}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  )
}

function RoadSceneNode({
  node,
  material,
  displayColorRef,
}: {
  node: THREE.Object3D
  material: RoadMaterialSettings
  displayColorRef: RefObject<THREE.Color>
}) {
  if ((node as THREE.Mesh).isMesh) {
    return (
      <RoadMeshNode
        key={node.uuid}
        mesh={node as THREE.Mesh}
        material={material}
        displayColorRef={displayColorRef}
      />
    )
  }

  if ((node as THREE.LineSegments).isLineSegments || (node as THREE.Line).isLine) {
    return null
  }

  const obj = node as THREE.Object3D
  return (
    <group
      key={node.uuid}
      position={obj.position}
      quaternion={obj.quaternion}
      scale={obj.scale}
    >
      {obj.children.map((child) => (
        <RoadSceneNode
          key={child.uuid}
          node={child}
          material={material}
          displayColorRef={displayColorRef}
        />
      ))}
    </group>
  )
}

/**
 * Background blueprint road network — aligned to World Origin with buildings,
 * non-interactive (PATHWAYS layer + disabled raycast).
 */
export function RoadsGroup() {
  const gltf = useAssetLoader(CAMPUS_ROADS_GLB_PATH)
  const roadsMaterial = useStore((s) => s.roadsMaterial)
  const roadsVisible = useStore((s) => s.roadsVisible)
  const cameraMode = useStore((s) => s.cameraMode)
  const cameraTransitionSpeed = useStore((s) => s.cameraTransitionSpeed)
  const groupRef = useRef<Group>(null)
  const position = gpsToWorldPosition(WORLD_ORIGIN.lat, WORLD_ORIGIN.lon)

  const roadsScene = useMemo(() => prepareRoadsScene(gltf.scene), [gltf.scene])

  const displayColorRef = useRef(
    bakeRoadDisplayColor({
      color: roadViewBaseColor(roadsMaterial, cameraMode),
      opacity: roadsMaterial.opacity,
    }),
  )

  useLayoutEffect(() => {
    const target = bakeRoadDisplayColor({
      color: roadViewBaseColor(roadsMaterial, cameraMode),
      opacity: roadsMaterial.opacity,
    })

    gsap.killTweensOf(displayColorRef.current)
    gsap.to(displayColorRef.current, {
      r: target.r,
      g: target.g,
      b: target.b,
      duration: cameraTransitionSpeed,
      ease: 'power2.inOut',
      overwrite: true,
    })
  }, [
    cameraMode,
    roadsMaterial.color,
    roadsMaterial.opacity,
    cameraTransitionSpeed,
  ])

  useEffect(
    () => () => {
      gsap.killTweensOf(displayColorRef.current)
    },
    [],
  )

  useLayoutEffect(() => {
    const root = groupRef.current
    if (!root) return
    root.traverse((child) => {
      child.layers.enable(RENDER_LAYERS.PATHWAYS)
    })
  }, [roadsScene])

  useEffect(() => {
    if (roadsScene) {
      console.info('[RoadsGroup] loaded terrain_roads geometry')
    }
  }, [roadsScene])

  if (!roadsScene || !roadsVisible) return null

  return (
    <group ref={groupRef} name="RoadsGroup" position={position}>
      <group position={[0, ROADS_ABOVE_GRID_EPS, 0]}>
        <RoadSceneNode
          node={roadsScene}
          material={roadsMaterial}
          displayColorRef={displayColorRef}
        />
      </group>
    </group>
  )
}
