import { useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { useAssetLoader } from '../../hooks/useAssetLoader'
import { useStore } from '../../store/useStore'
import { gpsToWorldPosition } from '../../utils/gps'
import { WORLD_ORIGIN } from '../../constants/coordinates'
import { RENDER_LAYERS } from '../../constants/renderLayers'
import type { AuxBuildingMaterialSettings } from '../../constants/sceneMaterials'

/** Public path to the auxiliary / background buildings GLB (same World Origin anchor). */
export const AUX_BUILDINGS_GLB_PATH = '/models/aux_buildings.glb'

useAssetLoader.preload(AUX_BUILDINGS_GLB_PATH)

const _heroColor = new THREE.Color()
const _scratchHsl = { h: 0, s: 0, l: 0 }

type AuxColorDerivation = Pick<
  AuxBuildingMaterialSettings,
  'fillSaturationMult' | 'fillLightnessMult' | 'minLightness'
>

type AuxEdgeColorDerivation = Pick<
  AuxBuildingMaterialSettings,
  'edgeSaturationMult' | 'edgeLightnessMult' | 'minLightness'
>

/**
 * Derives a muted aux fill hex color from the live hero building tint.
 * Same hue family as the main campus; lower saturation and darker lightness.
 */
export function deriveAuxBuildingColor(
  heroHex: string,
  settings: AuxColorDerivation,
): string {
  _heroColor.set(heroHex)
  _heroColor.getHSL(_scratchHsl)

  const fill = new THREE.Color().setHSL(
    _scratchHsl.h,
    _scratchHsl.s * settings.fillSaturationMult,
    Math.max(settings.minLightness, _scratchHsl.l * settings.fillLightnessMult),
  )

  return `#${fill.getHexString()}`
}

/**
 * Crease tint derived from the same hero hue as aux fills, but pulled up in
 * saturation/lightness so outlines read without matching interactive linework.
 */
export function deriveAuxBuildingEdgeColor(
  heroHex: string,
  settings: AuxEdgeColorDerivation,
): string {
  _heroColor.set(heroHex)
  _heroColor.getHSL(_scratchHsl)

  const edge = new THREE.Color().setHSL(
    _scratchHsl.h,
    _scratchHsl.s * settings.edgeSaturationMult,
    Math.max(settings.minLightness, _scratchHsl.l * settings.edgeLightnessMult),
  )

  return `#${edge.getHexString()}`
}

/**
 * Shared fallback material applied during GLB traversal after stripping
 * imported Blender materials (keeps the source graph valid, avoids leaks).
 */
const AUX_STRIPPED_MATERIAL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
})

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

/**
 * Removes imported mesh materials from the loaded GLB and disposes them.
 * Meshes receive a shared lightweight fallback so the graph stays valid.
 */
export function stripAuxImportedMaterials(root: THREE.Object3D): number {
  if (root.userData.__auxMaterialsStripped === true) {
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
    mesh.material = AUX_STRIPPED_MATERIAL
  })

  root.userData.__auxMaterialsStripped = true
  return strippedCount
}

interface AuxMeshStyle {
  fillColor: string
  edgeColor: string
  opacity: number
  edgeLineWidth: number
  edgeOpacity: number
  edgeThreshold: number
  showEdges: boolean
}

function AuxMeshNode({ mesh, style }: { mesh: THREE.Mesh; style: AuxMeshStyle }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useLayoutEffect(() => {
    const m = meshRef.current
    if (!m) return
    m.raycast = () => null
    m.layers.enable(RENDER_LAYERS.ENVIRONMENT)
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
      raycast={() => null}
      renderOrder={-5}
    >
      <meshBasicMaterial
        color={style.fillColor}
        transparent
        opacity={style.opacity}
        depthTest
        depthWrite={false}
      />
      {style.showEdges ? (
        <Edges
          key={`${mesh.geometry.uuid}-${style.edgeThreshold}`}
          threshold={style.edgeThreshold}
          color={style.edgeColor}
          transparent
          opacity={style.edgeOpacity}
          linewidth={style.edgeLineWidth}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          renderOrder={-4}
        />
      ) : null}
    </mesh>
  )
}

function AuxSceneNode({ node, style }: { node: THREE.Object3D; style: AuxMeshStyle }) {
  if ((node as THREE.Mesh).isMesh) {
    return <AuxMeshNode key={node.uuid} mesh={node as THREE.Mesh} style={style} />
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
        <AuxSceneNode key={child.uuid} node={child} style={style} />
      ))}
    </group>
  )
}

/**
 * Background auxiliary buildings — aligned to World Origin with hero buildings,
 * visually muted, and fully non-interactive (ENVIRONMENT layer + disabled raycast).
 */
export function AuxBuildingsGroup() {
  const gltf = useAssetLoader(AUX_BUILDINGS_GLB_PATH)
  const heroColor = useStore((s) => s.blueprintBuildingMaterial.color)
  const aux = useStore((s) => s.auxBuildingMaterial)
  const groupRef = useRef<Group>(null)
  const position = gpsToWorldPosition(WORLD_ORIGIN.lat, WORLD_ORIGIN.lon)

  const meshStyle = useMemo((): AuxMeshStyle => {
    const fillColor = deriveAuxBuildingColor(heroColor, aux)
    const edgeColor = aux.deriveEdgeColorFromHero
      ? deriveAuxBuildingEdgeColor(heroColor, aux)
      : aux.edgeColor

    return {
      fillColor,
      edgeColor,
      opacity: aux.opacity,
      edgeLineWidth: aux.edgeLineWidth,
      edgeOpacity: aux.edgeOpacity,
      edgeThreshold: aux.edgeThreshold,
      showEdges: aux.showEdges,
    }
  }, [heroColor, aux])

  const scene = useMemo(() => {
    stripAuxImportedMaterials(gltf.scene)
    return gltf.scene
  }, [gltf.scene])

  useEffect(() => {
    AUX_STRIPPED_MATERIAL.color.set(meshStyle.fillColor)
    AUX_STRIPPED_MATERIAL.opacity = meshStyle.opacity
    AUX_STRIPPED_MATERIAL.transparent = meshStyle.opacity < 1
  }, [meshStyle.fillColor, meshStyle.opacity])

  useLayoutEffect(() => {
    const root = groupRef.current
    if (!root) return
    root.traverse((child) => {
      child.layers.enable(RENDER_LAYERS.ENVIRONMENT)
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).raycast = () => null
      }
    })
  }, [scene])

  useEffect(() => {
    let meshCount = 0
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) meshCount += 1
    })
    console.info(`[AuxBuildingsGroup] loaded ${meshCount} auxiliary mesh nodes`)
  }, [scene])

  return (
    <group ref={groupRef} name="AuxBuildingsGroup" position={position}>
      {scene.children.map((child) => (
        <AuxSceneNode key={child.uuid} node={child} style={meshStyle} />
      ))}
    </group>
  )
}
