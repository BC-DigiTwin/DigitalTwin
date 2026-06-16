import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, type CampusBuilding } from '../../store/useStore'
import { mockBuildings } from '../../../lib/mockDatabase'

/* ── Name helpers (mirror the waypoint panel's resolution order) ──────── */

function prettifyBuildingId(id: string): string {
  return id
    .split('_')
    .map((part) =>
      part.length <= 1
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

function buildingDisplayName(
  id: string,
  registry: readonly CampusBuilding[],
): string {
  const mock = mockBuildings.find((b) => b.id === id)
  if (mock?.name) return mock.name
  const reg = registry.find((b) => b.id === id)
  if (reg?.name && reg.name !== id) return prettifyBuildingId(reg.name)
  return prettifyBuildingId(id)
}

/* ── Top-of-building anchor measurement ───────────────────────────────── */

const _box = new THREE.Box3()
const _other = new THREE.Box3()
const _center = new THREE.Vector3()

/** World-space top-center of every mesh tagged with `buildingId`, or null. */
function measureTopCenter(
  root: THREE.Object3D,
  buildingId: string,
): [number, number, number] | null {
  let found = false
  root.updateMatrixWorld(true)
  root.traverse((obj) => {
    if (obj.type !== 'Mesh') return
    const mesh = obj as THREE.Mesh
    if (mesh.userData.buildingId !== buildingId) return
    if (!found) {
      _box.setFromObject(mesh)
      found = true
    } else {
      _other.setFromObject(mesh)
      _box.union(_other)
    }
  })
  if (!found) return null
  _box.getCenter(_center)
  return [_center.x, _box.max.y, _center.z]
}

/**
 * Floating name tag that follows the hovered building.
 *
 * The campus is greyboxed, so a hover label is the fastest way to make the
 * scene legible during a demo ("which one is the library?"). Renders nothing
 * for the currently selected building — the side panel already names it.
 *
 * Mounted inside the `<Canvas>` so it can use drei's `<Html>` to project the
 * building's top-center to screen space.
 */
export function BuildingHoverLabel() {
  const hoveredId = useStore((s) => s.hoveredId)
  const selectedEntity = useStore((s) => s.selectedEntity)
  const registry = useStore((s) => s.campusBuildings)
  const scene = useThree((s) => s.scene)

  const show =
    !!hoveredId &&
    hoveredId !== selectedEntity &&
    /^building_/.test(hoveredId)

  const anchor = useMemo(
    () => (show && hoveredId ? measureTopCenter(scene, hoveredId) : null),
    [show, hoveredId, scene],
  )

  if (!show || !anchor || !hoveredId) return null

  const name = buildingDisplayName(hoveredId, registry)

  return (
    <Html
      position={[anchor[0], anchor[1] + 6, anchor[2]]}
      center
      zIndexRange={[30, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/15 bg-neutral-950/75 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md">
        {name}
      </div>
    </Html>
  )
}
