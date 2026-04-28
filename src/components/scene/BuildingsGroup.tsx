import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { useAssetLoader } from '../../hooks/useAssetLoader'
import { useInteractiveLayer } from '../../hooks/useInteractiveLayer'
import { useClickDragThreshold } from '../../hooks/useClickDragThreshold'
import { gpsToWorldPosition } from '../../utils/gps'
import { setPointerCursor } from '../../utils/pointerCursor'
import { WORLD_ORIGIN } from '../../constants/coordinates'
import {
  BLUEPRINT_BUILDING_DEFAULTS,
  type BlueprintBuildingMaterialSettings,
} from '../../constants/sceneMaterials'
import { RimLightMaterial } from './RimLightMaterial'

/** Public path to the campus greybox GLB (World Origin = scene anchor). */
export const CAMPUS_GLB_PATH = '/models/campus_greybox.glb'

// Preload so Suspense can resolve when BuildingsGroup mounts
useAssetLoader.preload(CAMPUS_GLB_PATH)

const RIM_GLOW_COLOR = '#00ffff'

/**
 * Shared MeshBasicMaterial for stripped GLB meshes — synced from store so it matches
 * the rendered RimLightMaterial tint (see BuildingsGroup useEffect).
 */
const STRIPPED_MATERIAL = new THREE.MeshBasicMaterial({
  color: BLUEPRINT_BUILDING_DEFAULTS.color,
  transparent: BLUEPRINT_BUILDING_DEFAULTS.opacity < 1,
  opacity: BLUEPRINT_BUILDING_DEFAULTS.opacity,
})

interface SceneNodeProps {
  node: THREE.Object3D
  hoveredBuildingId: string | null
  setHoveredBuildingId: (id: string | null) => void
  /** UUID of the parent group that represents this building (walls + roof share this). */
  buildingId: string | null
  blueprint: BlueprintBuildingMaterialSettings
}

export interface BuildingMeshNode {
  mesh: THREE.Mesh
  meshId: string
  meshName: string
  buildingId: string
  buildingName: string
}

/**
 * Removes imported mesh materials from a loaded GLB scene and disposes them.
 * We keep one shared lightweight fallback material so the source graph remains
 * valid while avoiding many unique Blender material allocations.
 */
export function stripImportedMaterials(root: THREE.Object3D): number {
  if (root.userData.__materialsStripped === true) {
    return 0
  }

  let strippedCount = 0
  root.traverse((obj) => {
    if (obj.type !== 'Mesh') return

    const mesh = obj as THREE.Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((material) => {
      if (material) {
        material.dispose()
        strippedCount += 1
      }
    })
    mesh.material = STRIPPED_MATERIAL
  })

  root.userData.__materialsStripped = true
  return strippedCount
}

/**
 * Recursively walks a loaded GLB scene and returns every mesh node.
 * Each mesh is tagged with the nearest parent "building" group so callers can
 * treat all child parts (walls, roof, etc.) as one selectable building.
 */
export function collectBuildingMeshNodes(
  node: THREE.Object3D,
  parentBuilding: { id: string; name: string } | null = null,
): BuildingMeshNode[] {
  const nextBuilding =
    parentBuilding ??
    (node.type === 'Scene'
      ? null
      : {
          id: node.uuid,
          name: node.name || 'Unnamed building',
        })

  if (node.type === 'Mesh') {
    const mesh = node as THREE.Mesh
    const building = parentBuilding ?? {
      id: mesh.uuid,
      name: mesh.name || 'Unnamed building',
    }

    return [
      {
        mesh,
        meshId: mesh.uuid,
        meshName: mesh.name || 'Unnamed mesh',
        buildingId: building.id,
        buildingName: building.name,
      },
    ]
  }

  return node.children.flatMap((child) => collectBuildingMeshNodes(child, nextBuilding))
}

/** Crease / outline lines (separate color from filled faces). */
function BlueprintEdgeOverlay({
  geometry,
  threshold,
  color,
  opacity,
  visible,
}: {
  geometry: THREE.BufferGeometry
  threshold: number
  color: string
  opacity: number
  visible: boolean
}) {
  const edgesGeometry = useMemo(
    () => new THREE.EdgesGeometry(geometry, threshold),
    [geometry, threshold],
  )

  useEffect(() => {
    return () => {
      edgesGeometry.dispose()
    }
  }, [edgesGeometry])

  if (!visible) return null

  return (
    <lineSegments geometry={edgesGeometry}>
      <lineBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={false}
      />
    </lineSegments>
  )
}

const BUILDING_GRID_VERTEX_SHADER = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPosition = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const BUILDING_GRID_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uCellSize;
uniform float uLinePx;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

float squareGridLines(vec2 uv, float cell, float linePx) {
  vec2 coord = fract(uv / cell);
  vec2 fw = fwidth(uv / cell);
  fw = max(fw, vec2(1e-6));
  vec2 edgeDist = min(coord, vec2(1.0) - coord);
  float mx = 1.0 - smoothstep(0.0, linePx * fw.x, edgeDist.x);
  float my = 1.0 - smoothstep(0.0, linePx * fw.y, edgeDist.y);
  return max(mx, my);
}

void main() {
  vec3 an = abs(normalize(vWorldNormal));
  float sum = an.x + an.y + an.z + 1e-5;
  vec3 w = an / sum;

  float gx = squareGridLines(vWorldPosition.yz, uCellSize, uLinePx);
  float gy = squareGridLines(vWorldPosition.xz, uCellSize, uLinePx);
  float gz = squareGridLines(vWorldPosition.xy, uCellSize, uLinePx);

  float lines = gx * w.x + gy * w.y + gz * w.z;
  float alpha = lines * uOpacity;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`

/**
 * Square world-axis grid on mesh surfaces (triplanar blend). Independent of crease edges.
 */
function BuildingSquareGridOverlay({
  geometry,
  color,
  opacity,
  cellSize,
  doubleSide,
  visible,
}: {
  geometry: THREE.BufferGeometry
  color: string
  opacity: number
  cellSize: number
  doubleSide: boolean
  visible: boolean
}) {
  // R3F does not reliably apply a new `uniforms` object to an existing ShaderMaterial when
  // props change — keep one stable object; actual values are pushed in useLayoutEffect.
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 1 },
      uCellSize: { value: 1 },
      uLinePx: { value: 1.35 },
    }),
    [],
  )

  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useLayoutEffect(() => {
    const mat = materialRef.current
    if (!mat) return
    mat.uniforms.uColor.value.set(color)
    mat.uniforms.uOpacity.value = opacity
    mat.uniforms.uCellSize.value = Math.max(0.05, cellSize)
    mat.side = doubleSide ? THREE.DoubleSide : THREE.FrontSide
  }, [color, opacity, cellSize, doubleSide])

  if (!visible) return null

  return (
    <mesh geometry={geometry} raycast={() => undefined}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={BUILDING_GRID_VERTEX_SHADER}
        fragmentShader={BUILDING_GRID_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        depthTest
        side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  )
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
  blueprint,
}: SceneNodeProps) {
  if (node.type === 'Mesh') {
    const mesh = node as THREE.Mesh
    const id = mesh.uuid
    const buildingId = parentBuildingId ?? id
    const isHovered = hoveredBuildingId === buildingId

    return (
      <group
        key={id}
        position={mesh.position.clone()}
        quaternion={mesh.quaternion.clone()}
        scale={mesh.scale.clone()}
      >
        <mesh
          geometry={mesh.geometry}
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
            color={blueprint.color}
            transparent={blueprint.opacity < 1}
            opacity={blueprint.opacity}
            emissive={blueprint.color}
            emissiveIntensity={blueprint.emissiveIntensity}
            metalness={0}
            roughness={0.92}
            depthWrite={false}
            side={blueprint.doubleSide ? THREE.DoubleSide : THREE.FrontSide}
            uColor={RIM_GLOW_COLOR}
            uIntensity={isHovered ? 1 : 0}
          />
        </mesh>
        <BlueprintEdgeOverlay
          geometry={mesh.geometry}
          threshold={blueprint.edgeThreshold}
          color={blueprint.edgeColor}
          opacity={blueprint.edgeOpacity}
          visible={blueprint.showEdges}
        />
        <BuildingSquareGridOverlay
          geometry={mesh.geometry}
          color={blueprint.buildingGridColor}
          opacity={blueprint.buildingGridOpacity}
          cellSize={blueprint.buildingGridCellSize}
          doubleSide={blueprint.doubleSide}
          visible={blueprint.showBuildingGrid}
        />
      </group>
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
          blueprint={blueprint}
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
 *
 * All meshes are added to the INTERACTIVE render layer so the
 * raycaster can hit-test them for selection / hover events.
 * Click events use a drag-threshold check so camera pans are ignored.
 */
export function BuildingsGroup() {
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null)
  const visible = useStore((s) => s.layers.buildings)
  const blueprint = useStore((s) => s.blueprintBuildingMaterial)
  const gltf = useAssetLoader(CAMPUS_GLB_PATH)

  useInteractiveLayer(gltf.scene)

  const position = gpsToWorldPosition(WORLD_ORIGIN.lat, WORLD_ORIGIN.lon)

  useEffect(() => {
    STRIPPED_MATERIAL.color.set(blueprint.color)
    STRIPPED_MATERIAL.opacity = blueprint.opacity
    STRIPPED_MATERIAL.transparent = blueprint.opacity < 1
  }, [blueprint.color, blueprint.opacity])

  const scene = useMemo(() => {
    stripImportedMaterials(gltf.scene)
    return gltf.scene
  }, [gltf.scene])
  const buildingMeshNodes = useMemo(() => collectBuildingMeshNodes(scene), [scene])
  const meshToBuildingMap = useMemo(
    () => new Map(buildingMeshNodes.map((entry) => [entry.meshId, entry])),
    [buildingMeshNodes],
  )

  useEffect(() => {
    console.info(`[BuildingsGroup] loaded ${buildingMeshNodes.length} building mesh nodes`)
  }, [buildingMeshNodes])

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const meshEntry = meshToBuildingMap.get(e.object.uuid)
    const name =
      meshEntry?.buildingName ??
      e.object.name ??
      e.object.parent?.name ??
      '(unnamed)'
    console.log('[BuildingsGroup] clicked:', name, e.point)
  }, [meshToBuildingMap])

  const clickHandlers = useClickDragThreshold(handleClick)

  return (
    <group name="BuildingsGroup" visible={visible} position={position} {...clickHandlers}>
      {scene.children.map((child) => (
        <SceneNode
          key={child.uuid}
          node={child}
          hoveredBuildingId={hoveredBuildingId}
          setHoveredBuildingId={setHoveredBuildingId}
          buildingId={null}
          blueprint={blueprint}
        />
      ))}
    </group>
  )
}
