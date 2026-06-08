import { useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import type { Group, Object3D } from 'three'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { useAssetLoader } from '../../hooks/useAssetLoader'
import { gpsToWorldPosition } from '../../utils/gps'
import { WORLD_ORIGIN } from '../../constants/coordinates'
import { RENDER_LAYERS } from '../../constants/renderLayers'

/** Public path to the campus road network GLB (same World Origin anchor as buildings). */
export const CAMPUS_ROADS_GLB_PATH = '/models/campus_roads.glb'

/** Blender object / mesh name for the road network in `campus_roads.glb`. */
const ROADS_OBJECT_NAME = 'terrain_roads'

/** Subtle dark blueprint fill — grid shows through slightly. */
const ROADS_FACE_COLOR = '#0f172a'
const ROADS_FACE_OPACITY = 0.5

/** Crisp architectural edge lines (lighter than fill for silhouette). */
const ROADS_EDGE_COLOR = '#6a8499'
/** Baked into RGB so lines stay opaque — correct depth occlusion vs transparent buildings (see TerrainGroup). */
const ROADS_EDGE_INTENSITY = 0.9
const ROADS_EDGE_THRESHOLD = 15

useAssetLoader.preload(CAMPUS_ROADS_GLB_PATH)

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function matchesRoadsName(name: string): boolean {
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

  const prepared = anchor.clone(true)
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

function RoadMeshNode({ mesh }: { mesh: THREE.Mesh }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const edgeColor = useMemo(() => {
    const c = new THREE.Color(ROADS_EDGE_COLOR)
    c.multiplyScalar(ROADS_EDGE_INTENSITY)
    return `#${c.getHexString()}`
  }, [])

  useLayoutEffect(() => {
    const m = meshRef.current
    if (!m) return
    m.raycast = () => undefined
    m.layers.enable(RENDER_LAYERS.PATHWAYS)
  }, [])

  if (!meshHasTriangleFaces(mesh.geometry) || vertexCount(mesh.geometry) === 0) {
    return null
  }

  return (
    <mesh
      ref={meshRef}
      geometry={mesh.geometry}
      position={mesh.position}
      quaternion={mesh.quaternion}
      scale={mesh.scale}
      renderOrder={-10}
    >
      <meshBasicMaterial
        color={ROADS_FACE_COLOR}
        transparent
        opacity={ROADS_FACE_OPACITY}
        depthTest
        depthWrite
      />
      <Edges
        threshold={ROADS_EDGE_THRESHOLD}
        color={edgeColor}
        depthTest
        depthWrite
        transparent={false}
      />
    </mesh>
  )
}

function RoadLineNode({ line }: { line: THREE.Line | THREE.LineSegments }) {
  const lineRef = useRef<THREE.Line | THREE.LineSegments>(null)

  const edgeColor = useMemo(() => {
    const c = new THREE.Color(ROADS_EDGE_COLOR)
    c.multiplyScalar(ROADS_EDGE_INTENSITY)
    return `#${c.getHexString()}`
  }, [])

  useLayoutEffect(() => {
    const l = lineRef.current
    if (!l) return
    l.raycast = () => undefined
    l.layers.enable(RENDER_LAYERS.PATHWAYS)
  }, [])

  if (vertexCount(line.geometry) === 0) return null

  const Tag = (line as THREE.LineSegments).isLineSegments ? 'lineSegments' : 'line'

  return (
    <Tag
      ref={lineRef}
      geometry={line.geometry}
      position={line.position}
      quaternion={line.quaternion}
      scale={line.scale}
      renderOrder={-10}
    >
      <lineBasicMaterial
        color={edgeColor}
        depthTest
        depthWrite
        transparent={false}
      />
    </Tag>
  )
}

function RoadSceneNode({ node }: { node: THREE.Object3D }) {
  if ((node as THREE.Mesh).isMesh) {
    return <RoadMeshNode key={node.uuid} mesh={node as THREE.Mesh} />
  }

  if ((node as THREE.LineSegments).isLineSegments || (node as THREE.Line).isLine) {
    return <RoadLineNode key={node.uuid} line={node as THREE.Line | THREE.LineSegments} />
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
        <RoadSceneNode key={child.uuid} node={child} />
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
  const groupRef = useRef<Group>(null)
  const position = gpsToWorldPosition(WORLD_ORIGIN.lat, WORLD_ORIGIN.lon)

  const roadsScene = useMemo(() => prepareRoadsScene(gltf.scene), [gltf.scene])

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

  if (!roadsScene) return null

  return (
    <group ref={groupRef} name="RoadsGroup" position={position}>
      <RoadSceneNode node={roadsScene} />
    </group>
  )
}
