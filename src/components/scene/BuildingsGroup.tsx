import {
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Edges, type EdgesRef } from '@react-three/drei'
import * as THREE from 'three'
import { damp, dampC } from 'maath/easing'
import { useStore } from '../../store/useStore'
import { useAssetLoader } from '../../hooks/useAssetLoader'
import { useInteractiveLayer } from '../../hooks/useInteractiveLayer'
import { useClickDragThreshold } from '../../hooks/useClickDragThreshold'
import { gpsToWorldPosition } from '../../utils/gps'
import { setPointerCursor } from '../../utils/pointerCursor'
import { WORLD_ORIGIN } from '../../constants/coordinates'
import { RENDER_LAYERS } from '../../constants/renderLayers'
import {
  BLUEPRINT_BUILDING_DEFAULTS,
  INTERACTION_STATE_COLORS,
  MUTED_INTERACTION_MULTIPLIERS,
  SELECTED_BUILDING_LIFT_AMOUNT,
  SELECTED_BUILDING_LIFT_SMOOTH_TIME,
  SELECTED_BUILDING_SPIN_SPEED,
  type BlueprintBuildingMaterialSettings,
  type InteractionStateColor,
} from '../../constants/sceneMaterials'
import { RimLightMaterial, type RimLightMaterialHandle } from './RimLightMaterial'
import {
  buildingDisplayName,
  canonicalBuildingMeshName,
  stableBuildingId,
} from '../../utils/buildingMeshName'

/**
 * Smooth-time (seconds) for `maath/easing` damping of rim color and intensity.
 * Roughly the time it takes to reach ~90% of the target value.
 * Lower = snappier hover feel; higher = lazier ease.
 */
const INTERACTION_DAMP_SMOOTH_TIME = 0.15

/**
 * Default peak rim `uIntensity` when a state does not set `rimIntensity`.
 * Per-state overrides live on `INTERACTION_STATE_COLORS` (HOVER / SELECTED).
 */
const DEFAULT_INTERACTION_RIM_INTENSITY = 5

/**
 * Raycasts often hit Drei `Edges` (line segments) or other children, not the
 * R3F `<mesh>` ref. We stamp the **source** GLB mesh uuid on that mesh so any
 * descendant can walk `parent` chains and recover `collectBuildingMeshNodes` data.
 */
const BUILDING_SOURCE_MESH_UUID_KEY = '__buildingSourceMeshUuid'

/** Public path to the campus greybox GLB (World Origin = scene anchor). */
export const CAMPUS_GLB_PATH = '/models/campus_greybox.glb'

// Preload so Suspense can resolve when BuildingsGroup mounts
useAssetLoader.preload(CAMPUS_GLB_PATH)

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
 * GLTF roots often wrap every mesh in one group (e.g. named "Scene") with a
 * single UUID. In that case `parentBuilding.id` is the same for all meshes.
 * When the mesh itself is named `building_a`, etc., use that slug as the id
 * so selection and mock/API rows stay per-building.
 */
export function resolveMeshBuildingIdentity(
  mesh: THREE.Mesh,
  parentBuilding: { id: string; name: string } | null,
): { id: string; name: string } {
  const slug = stableBuildingId(mesh)
  if (slug !== mesh.uuid) {
    return {
      id: slug,
      name: buildingDisplayName(mesh.name, parentBuilding?.name || 'Unnamed mesh'),
    }
  }
  if (parentBuilding) return parentBuilding
  return {
    id: slug,
    name: buildingDisplayName(mesh.name, 'Unnamed building'),
  }
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
          id: stableBuildingId(node),
          name: buildingDisplayName(node.name, 'Unnamed building'),
        })

  if (node.type === 'Mesh') {
    const mesh = node as THREE.Mesh
    const building = resolveMeshBuildingIdentity(mesh, parentBuilding)

    return [
      {
        mesh,
        meshId: mesh.uuid,
        meshName: buildingDisplayName(mesh.name, 'Unnamed mesh'),
        buildingId: building.id,
        buildingName: building.name,
      },
    ]
  }

  return node.children.flatMap((child) => collectBuildingMeshNodes(child, nextBuilding))
}

const BUILDING_GRID_VERTEX_SHADER = /* glsl */ `
varying vec3 vLocalPosition;
varying vec3 vLocalNormal;

void main() {
  // Triplanar sampling uses mesh-local coords so roofs/floors keep a grid that
  // rotates with the mesh (world-space XZ would stay map-aligned while the body spins).
  vLocalPosition = position;
  vLocalNormal = normalize(normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const BUILDING_GRID_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uCellSize;
uniform float uLinePx;

varying vec3 vLocalPosition;
varying vec3 vLocalNormal;

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
  vec3 an = abs(vLocalNormal);
  float sum = an.x + an.y + an.z + 1e-5;
  vec3 w = an / sum;

  float gx = squareGridLines(vLocalPosition.yz, uCellSize, uLinePx);
  float gy = squareGridLines(vLocalPosition.xz, uCellSize, uLinePx);
  float gz = squareGridLines(vLocalPosition.xy, uCellSize, uLinePx);

  float lines = gx * w.x + gy * w.y + gz * w.z;
  float alpha = lines * uOpacity;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`

/**
 * Square grid on mesh surfaces (triplanar in mesh-local space). Independent of crease edges.
 *
 * `externalMaterialRef` (optional) lets the parent dampen `uOpacity` per-frame
 * for muted/selected states without forcing a re-render of this overlay.
 */
function BuildingSquareGridOverlay({
  geometry,
  color,
  opacity,
  cellSize,
  doubleSide,
  visible,
  externalMaterialRef,
}: {
  geometry: THREE.BufferGeometry
  color: string
  opacity: number
  cellSize: number
  doubleSide: boolean
  visible: boolean
  externalMaterialRef?: React.MutableRefObject<THREE.ShaderMaterial | null>
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
        ref={(mat) => {
          materialRef.current = mat
          if (externalMaterialRef) externalMaterialRef.current = mat
        }}
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
 * Mesh-level interactable renderer.
 *
 * Performance contract:
 * - Hover/selection state is read via `useStore.subscribe` (imperative), NOT
 *   via the `useStore` hook, so per-mesh hover/click events do NOT trigger a
 *   React re-render of this component or any of its descendants.
 * - Rim color/intensity transitions are applied directly to the
 *   `RimLightMaterial` uniforms each frame (`useFrame` + `materialApi.lerp*`),
 *   so the campus tree is never re-rendered when only the highlight changes.
 *
 * The component still renders once per blueprint change (deliberate config tweak).
 */
function BuildingMeshNode({
  mesh,
  buildingId,
  blueprint,
}: {
  mesh: THREE.Mesh
  buildingId: string
  blueprint: BlueprintBuildingMaterialSettings
}) {
  const invalidate = useThree((s) => s.invalidate)
  const meshRef = useRef<THREE.Mesh>(null!)
  /**
   * Inner pivot group: this is the node we translate (lift) and rotate
   * (slow spin) when the building is selected. Keeping it separate from
   * the outer placement group means lift/spin happen around the building's
   * own local origin instead of the world origin.
   */
  const pivotGroupRef = useRef<THREE.Group>(null)
  const materialApiRef = useRef<RimLightMaterialHandle | null>(null)
  const edgesRef = useRef<EdgesRef | null>(null)
  const gridMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const targetColorRef = useRef(new THREE.Color(INTERACTION_STATE_COLORS.BASE.hex))
  const targetIntensityRef = useRef(0)
  const targetEdgeColorRef = useRef(new THREE.Color(blueprint.edgeColor))
  const targetEdgeOpacityRef = useRef(blueprint.edgeOpacity)
  const targetEdgeLinewidthRef = useRef(blueprint.edgeLineWidth)
  const edgeOpacityWrapperRef = useRef({ value: blueprint.edgeOpacity })
  const edgeLinewidthWrapperRef = useRef({ value: blueprint.edgeLineWidth })
  const targetBodyColorRef = useRef(new THREE.Color(blueprint.color))
  const targetEmissiveIntensityRef = useRef(blueprint.emissiveIntensity)
  const targetOpacityRef = useRef(blueprint.opacity)
  const opacityWrapperRef = useRef({ value: blueprint.opacity })
  const emissiveIntensityWrapperRef = useRef({ value: blueprint.emissiveIntensity })
  const targetGridOpacityRef = useRef(blueprint.buildingGridOpacity)
  const gridOpacityWrapperRef = useRef({ value: blueprint.buildingGridOpacity })
  const targetLiftRef = useRef(0)
  const liftWrapperRef = useRef({ value: 0 })
  const isSelectedFlagRef = useRef(false)
  const interactionTierRef = useRef<'base' | 'hover' | 'selected'>('base')

  useLayoutEffect(() => {
    const m = meshRef.current
    if (!m) return
    m.layers.enable(RENDER_LAYERS.INTERACTIVE)
    m.userData[BUILDING_SOURCE_MESH_UUID_KEY] = mesh.uuid
    m.userData.buildingId = buildingId
    if (mesh.name) {
      m.name = canonicalBuildingMeshName(mesh.name.trim()) || mesh.name
    }
  }, [mesh.uuid, mesh.name, buildingId])

  const computeTargets = useCallback(
    (
      hoveredId: string | null,
      selectedId: string | null,
      liftEnabled: boolean,
      muteOthersEnabled: boolean,
    ) => {
      const isSelected = selectedId === buildingId
      const isHovered = hoveredId === buildingId
      /**
       * Some *other* building is selected → this building should fade into
       * the background (only when the mute-others toggle is on). Hover
       * styling is also suppressed while muted so the focused building
       * remains the clear hero.
       */
      const isMuted = muteOthersEnabled && selectedId !== null && !isSelected

      const stateColor: InteractionStateColor = isSelected
        ? INTERACTION_STATE_COLORS.SELECTED
        : isHovered && !isMuted
          ? INTERACTION_STATE_COLORS.HOVER
          : INTERACTION_STATE_COLORS.BASE

      interactionTierRef.current = isSelected
        ? 'selected'
        : isHovered && !isMuted
          ? 'hover'
          : 'base'

      targetColorRef.current.set(stateColor.hex)
      targetIntensityRef.current =
        isSelected || (isHovered && !isMuted)
          ? (stateColor.rimIntensity ?? DEFAULT_INTERACTION_RIM_INTENSITY)
          : 0
      targetEdgeColorRef.current.set(stateColor.edgeHex ?? blueprint.edgeColor)
      targetEdgeOpacityRef.current = stateColor.edgeOpacity ?? blueprint.edgeOpacity
      targetEdgeLinewidthRef.current =
        blueprint.edgeLineWidth * (stateColor.edgeLineWidthScale ?? 1)
      targetBodyColorRef.current.set(stateColor.bodyHex ?? blueprint.color)
      targetEmissiveIntensityRef.current =
        stateColor.bodyEmissiveIntensity ?? blueprint.emissiveIntensity
      targetOpacityRef.current = stateColor.bodyOpacity ?? blueprint.opacity
      targetGridOpacityRef.current = blueprint.buildingGridOpacity

      if (isMuted) {
        targetOpacityRef.current *= MUTED_INTERACTION_MULTIPLIERS.bodyOpacity
        targetEmissiveIntensityRef.current *=
          MUTED_INTERACTION_MULTIPLIERS.emissiveIntensity
        targetEdgeOpacityRef.current *= MUTED_INTERACTION_MULTIPLIERS.edgeOpacity
        targetGridOpacityRef.current *= MUTED_INTERACTION_MULTIPLIERS.gridOpacity
      }

      // Lift + spin only when the selection lift toggle is on. Turning it off
      // also stops accumulating spin, and the per-frame "settle" branch eases
      // the pivot back to its base position and nearest clean rotation.
      targetLiftRef.current =
        liftEnabled && isSelected ? SELECTED_BUILDING_LIFT_AMOUNT : 0
      isSelectedFlagRef.current = liftEnabled && isSelected
    },
    [
      buildingId,
      blueprint.color,
      blueprint.edgeColor,
      blueprint.edgeOpacity,
      blueprint.edgeLineWidth,
      blueprint.emissiveIntensity,
      blueprint.opacity,
      blueprint.buildingGridOpacity,
    ],
  )

  useEffect(() => {
    const s = useStore.getState()
    computeTargets(
      s.hoveredId,
      s.selectedId,
      s.selectionLiftEnabled,
      s.selectionMuteOthersEnabled,
    )

    return useStore.subscribe((state, prev) => {
      if (
        state.hoveredId === prev.hoveredId &&
        state.selectedId === prev.selectedId &&
        state.selectionLiftEnabled === prev.selectionLiftEnabled &&
        state.selectionMuteOthersEnabled === prev.selectionMuteOthersEnabled
      ) {
        return
      }
      computeTargets(
        state.hoveredId,
        state.selectedId,
        state.selectionLiftEnabled,
        state.selectionMuteOthersEnabled,
      )
    })
  }, [computeTargets])

  /** Drei `<Edges>` often needs a follow-up frame after the mesh matrix is valid (line geometry / linewidth). */
  useEffect(() => {
    if (!blueprint.showEdges) return
    const id = requestAnimationFrame(() => {
      meshRef.current?.updateMatrixWorld(true)
      const edges = edgesRef.current
      if (edges) {
        edges.layers.enable(RENDER_LAYERS.INTERACTIVE)
        const raw = edges.material
        const mats = Array.isArray(raw) ? raw : [raw]
        for (const mat of mats) {
          if (mat) mat.needsUpdate = true
        }
      }
      invalidate()
    })
    return () => cancelAnimationFrame(id)
  }, [
    blueprint.showEdges,
    blueprint.edgeThreshold,
    blueprint.edgeColor,
    blueprint.edgeOpacity,
    blueprint.edgeLineWidth,
    mesh.geometry,
    invalidate,
  ])

  useFrame((_, delta) => {
    const api = materialApiRef.current
    if (api) {
      dampC(api.colorUniform.value, targetColorRef.current, INTERACTION_DAMP_SMOOTH_TIME, delta)
      damp(api.intensityUniform, 'value', targetIntensityRef.current, INTERACTION_DAMP_SMOOTH_TIME, delta)

      const material = api.getMaterial()
      if (material) {
        dampC(material.color, targetBodyColorRef.current, INTERACTION_DAMP_SMOOTH_TIME, delta)
        dampC(material.emissive, targetBodyColorRef.current, INTERACTION_DAMP_SMOOTH_TIME, delta)

        damp(
          emissiveIntensityWrapperRef.current,
          'value',
          targetEmissiveIntensityRef.current,
          INTERACTION_DAMP_SMOOTH_TIME,
          delta,
        )
        material.emissiveIntensity = emissiveIntensityWrapperRef.current.value

        damp(
          opacityWrapperRef.current,
          'value',
          targetOpacityRef.current,
          INTERACTION_DAMP_SMOOTH_TIME,
          delta,
        )
        material.opacity = opacityWrapperRef.current.value
      }
    }

    const gridMat = gridMaterialRef.current
    if (gridMat) {
      damp(
        gridOpacityWrapperRef.current,
        'value',
        targetGridOpacityRef.current,
        INTERACTION_DAMP_SMOOTH_TIME,
        delta,
      )
      gridMat.uniforms.uOpacity.value = gridOpacityWrapperRef.current.value
    }

    const pivot = pivotGroupRef.current
    if (pivot) {
      damp(
        liftWrapperRef.current,
        'value',
        targetLiftRef.current,
        SELECTED_BUILDING_LIFT_SMOOTH_TIME,
        delta,
      )
      pivot.position.y = liftWrapperRef.current.value

      if (isSelectedFlagRef.current) {
        // Active selection: keep accumulating yaw so the building slowly spins.
        pivot.rotation.y += SELECTED_BUILDING_SPIN_SPEED * delta
      } else {
        // Deselected: settle back to the nearest "clean" orientation (multiple
        // of 2π) so the building returns to its original facing without a
        // jarring reverse-spin from large angle accumulations.
        const cur = pivot.rotation.y
        const TWO_PI = Math.PI * 2
        const nearest = Math.round(cur / TWO_PI) * TWO_PI
        damp(
          pivot.rotation,
          'y',
          nearest,
          SELECTED_BUILDING_LIFT_SMOOTH_TIME,
          delta,
        )
      }
    }

    const edges = edgesRef.current
    if (edges) {
      const tier = interactionTierRef.current
      edges.renderOrder = tier === 'selected' ? 4 : tier === 'hover' ? 2 : 1

      const raw = edges.material
      const mat = Array.isArray(raw) ? raw[0] : raw
      if (mat && 'color' in mat) {
        dampC(
          mat.color as THREE.Color,
          targetEdgeColorRef.current,
          INTERACTION_DAMP_SMOOTH_TIME,
          delta,
        )
      }
      if (mat && 'opacity' in mat) {
        damp(
          edgeOpacityWrapperRef.current,
          'value',
          targetEdgeOpacityRef.current,
          INTERACTION_DAMP_SMOOTH_TIME,
          delta,
        )
        ;(mat as THREE.Material).transparent = edgeOpacityWrapperRef.current.value < 1
        ;(mat as THREE.Material).opacity = edgeOpacityWrapperRef.current.value
        ;(mat as THREE.Material).needsUpdate = true
      }
      if (mat && 'linewidth' in mat) {
        damp(
          edgeLinewidthWrapperRef.current,
          'value',
          targetEdgeLinewidthRef.current,
          INTERACTION_DAMP_SMOOTH_TIME,
          delta,
        )
        ;(mat as { linewidth: number }).linewidth = edgeLinewidthWrapperRef.current.value
      }
    }
  })

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setPointerCursor(true)
      useStore.getState().setHoveredId(buildingId)
    },
    [buildingId],
  )

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setPointerCursor(false)
    useStore.getState().setHoveredId(null)
  }, [])

  return (
    <group
      key={mesh.uuid}
      position={mesh.position.clone()}
      quaternion={mesh.quaternion.clone()}
      scale={mesh.scale.clone()}
    >
      <group ref={pivotGroupRef}>
        <mesh
          ref={meshRef}
          geometry={mesh.geometry}
          castShadow
          receiveShadow
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <RimLightMaterial
            ref={materialApiRef}
            color={blueprint.color}
            transparent={blueprint.opacity < 1}
            opacity={blueprint.opacity}
            emissive={blueprint.color}
            emissiveIntensity={blueprint.emissiveIntensity}
            metalness={0}
            roughness={0.92}
            depthWrite={false}
            side={blueprint.doubleSide ? THREE.DoubleSide : THREE.FrontSide}
            uColor={INTERACTION_STATE_COLORS.BASE.hex}
            uIntensity={0}
          />
          {blueprint.showEdges ? (
            <Edges
              key={`${mesh.geometry.uuid}-${blueprint.edgeThreshold}`}
              ref={edgesRef}
              threshold={blueprint.edgeThreshold}
              color={blueprint.edgeColor}
              transparent
              opacity={blueprint.edgeOpacity}
              linewidth={blueprint.edgeLineWidth}
              depthTest
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
              renderOrder={1}
            />
          ) : null}
        </mesh>
        <BuildingSquareGridOverlay
          geometry={mesh.geometry}
          color={blueprint.buildingGridColor}
          opacity={blueprint.buildingGridOpacity}
          cellSize={blueprint.buildingGridCellSize}
          doubleSide={blueprint.doubleSide}
          visible={blueprint.showBuildingGrid}
          externalMaterialRef={gridMaterialRef}
        />
      </group>
    </group>
  )
}

/**
 * Recursively renders GLB scene nodes. Groups pass a stable building id (see
 * `stableBuildingId` / `collectBuildingMeshNodes`) so hover, selection, and
 * click resolution all agree with `meshToBuildingMap`.
 */
function SceneNode({
  node,
  buildingId: parentBuildingId,
  blueprint,
}: SceneNodeProps) {
  if (node.type === 'Mesh') {
    const mesh = node as THREE.Mesh
    const parentBuilding =
      parentBuildingId !== null ? { id: parentBuildingId, name: '' } : null
    const { id: buildingId } = resolveMeshBuildingIdentity(mesh, parentBuilding)
    return <BuildingMeshNode mesh={mesh} buildingId={buildingId} blueprint={blueprint} />
  }

  const obj = node as THREE.Object3D
  const thisGroupId = parentBuildingId ?? stableBuildingId(obj)
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
 * Crease lines use @react-three/drei `Edges` as a child of each building mesh (#162).
 * Threshold is tuned for cleaner blueprint silhouettes on coplanar geometry (#163).
 * Visibility is driven by the global Zustand `layers.buildings` flag.
 *
 * All meshes are added to the INTERACTIVE render layer so the
 * raycaster can hit-test them for selection / hover events.
 * Click events use a drag-threshold check so camera pans are ignored.
 */
export function BuildingsGroup() {
  const visible = useStore((s) => s.layers.buildings)
  const blueprint = useStore((s) => s.blueprintBuildingMaterial)
  const setSelectedBuildingId = useStore((s) => s.setSelectedId)
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

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()

      let meshEntry: BuildingMeshNode | undefined
      let o: THREE.Object3D | null = e.object
      while (o) {
        const sourceUuid = o.userData[BUILDING_SOURCE_MESH_UUID_KEY] as
          | string
          | undefined
        if (sourceUuid) {
          meshEntry = meshToBuildingMap.get(sourceUuid)
          if (meshEntry) break
        }
        o = o.parent
      }

      const nextSelectedBuildingId =
        meshEntry?.buildingId ?? e.object.parent?.uuid ?? e.object.uuid
      setSelectedBuildingId(nextSelectedBuildingId)
      const label =
        meshEntry?.meshName ||
        meshEntry?.buildingName ||
        e.object.name ||
        e.object.parent?.name ||
        '(unnamed)'
      console.log('[BuildingsGroup] building click → store `selectedId`:', nextSelectedBuildingId)
      console.log('[BuildingsGroup] building click (detail)', {
        selectedId: nextSelectedBuildingId,
        displayLabel: label,
        meshEntryBuildingId: meshEntry?.buildingId,
        meshEntryMeshName: meshEntry?.meshName,
        meshEntryBuildingName: meshEntry?.buildingName,
        hitObjectName: e.object.name,
        point: e.point,
      })
    },
    [meshToBuildingMap, setSelectedBuildingId],
  )

  const clickHandlers = useClickDragThreshold(handleClick)

  return (
    <group name="BuildingsGroup" visible={visible} position={position} {...clickHandlers}>
      {scene.children.map((child) => (
        <SceneNode
          key={child.uuid}
          node={child}
          buildingId={null}
          blueprint={blueprint}
        />
      ))}
    </group>
  )
}
