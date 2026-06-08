import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Group } from 'three'
import { useStore } from '../../store/useStore'
import { useRenderLayer } from '../../hooks/useInteractiveLayer'
import { RENDER_LAYERS } from '../../constants/renderLayers'
import {
  TERRAIN_GROUND_PLANE_BOUNDS,
  TERRAIN_GROUND_PLANE_DEPTH_BIAS,
  TERRAIN_GROUND_GRID_CELL_SIZE,
  TERRAIN_GROUND_GRID_RENDER_ORDER,
  TERRAIN_GROUND_GRID_Y,
} from '../../constants/sceneMaterials'

/** Previously line opacity 0.62; baked into RGB so the material can stay non-transparent (correct render order vs buildings). */
const GRID_LINE_INTENSITY = 0.62

/**
 * Line grid exactly covering `x0…x1` × `z0…z1` at height `y` (same footprint as ground).
 */
function TerrainGroundGridLines({
  x0,
  x1,
  z0,
  z1,
  y,
  lineColor,
}: {
  x0: number
  x1: number
  z0: number
  z1: number
  y: number
  lineColor: string
}) {
  const materialColor = useMemo(() => {
    const c = new THREE.Color(lineColor)
    c.multiplyScalar(GRID_LINE_INTENSITY)
    return `#${c.getHexString()}`
  }, [lineColor])

  const geometry = useMemo(() => {
    const positions: number[] = []
    const w = x1 - x0
    const d = z1 - z0
    const cell = TERRAIN_GROUND_GRID_CELL_SIZE
    const nx = Math.max(1, Math.ceil(w / cell))
    const nz = Math.max(1, Math.ceil(d / cell))
    const stepX = w / nx
    const stepZ = d / nz
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * stepX
      positions.push(x, y, z0, x, y, z1)
    }
    for (let j = 0; j <= nz; j++) {
      const z = z0 + j * stepZ
      positions.push(x0, y, z, x1, y, z)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
    )
    return g
  }, [x0, x1, z0, z1, y])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineSegments geometry={geometry} renderOrder={TERRAIN_GROUND_GRID_RENDER_ORDER}>
      <lineBasicMaterial
        color={materialColor}
        depthTest
        depthWrite
        transparent={false}
      />
    </lineSegments>
  )
}

/**
 * Scene-graph group for terrain / ground-plane placeholders.
 *
 * Visibility is driven by the global Zustand `layers.terrain` flag.
 * Tagged with `RENDER_LAYERS.TERRAIN` (layer 3) — the raycaster
 * ignores it.
 */
export function TerrainGroup() {
  const visible = useStore((s) => s.layers.terrain)
  const showGroundPlane = useStore((s) => s.terrainShowGroundPlane)
  const showGrid = useStore((s) => s.terrainShowGrid)
  const gridLineColor = useStore((s) => s.terrainGridLineColor)
  const { color, roughness, metalness } = useStore((s) => s.terrainGroundMaterial)
  const groupRef = useRef<Group>(null)

  useRenderLayer(groupRef.current, RENDER_LAYERS.TERRAIN)

  const { xMin, xMax, zMin, zMax, positionY } = TERRAIN_GROUND_PLANE_BOUNDS

  const x0 = Math.min(xMin, xMax)
  const x1 = Math.max(xMin, xMax)
  const z0 = Math.min(zMin, zMax)
  const z1 = Math.max(zMin, zMax)
  const width = Math.max(0.01, x1 - x0)
  const depth = Math.max(0.01, z1 - z0)
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const gridY = TERRAIN_GROUND_GRID_Y

  return (
    <group ref={groupRef} name="TerrainGroup" visible={visible}>
      {showGroundPlane && (
        <mesh
          position={[cx, positionY - TERRAIN_GROUND_PLANE_DEPTH_BIAS, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1}
            roughness={roughness}
            metalness={metalness}
          />
        </mesh>
      )}
      {showGrid && (
        <TerrainGroundGridLines
          x0={x0}
          x1={x1}
          z0={z0}
          z1={z1}
          y={gridY}
          lineColor={gridLineColor}
        />
      )}
    </group>
  )
}
