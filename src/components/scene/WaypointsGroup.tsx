import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'
import type { default as CameraControlsImpl } from 'camera-controls'

import { useStore } from '../../store/useStore'
import { RENDER_LAYERS } from '../../constants/renderLayers'
import { TERRAIN_GROUND_PLANE_BOUNDS } from '../../constants/sceneMaterials'
import { useClickDragThreshold } from '../../hooks/useClickDragThreshold'
import { setPointerCursor } from '../../utils/pointerCursor'
import {
  clampToTerrainFootprint,
  snapWaypointYToTerrain,
} from '../../utils/waypointTerrain'
import {
  generateDummyWaypointsForBuildings,
  generateWaypointId,
  INITIAL_WAYPOINTS,
  loadStoredWaypoints,
  saveWaypointsToStorage,
  type Waypoint,
  type WaypointCategory,
} from '../../../lib/mockWaypoints'
import { WaypointMarker, type WaypointVisualState } from './WaypointMarker'

/* ── Hydration ───────────────────────────────────────────────────────── */

/**
 * Hydrates waypoints from localStorage (or seed) on first mount and keeps
 * `localStorage` in sync with every subsequent edit. Hydration is gated by
 * an empty-store check rather than a `hasRun` ref so that React 19
 * StrictMode's double-mount can re-subscribe cleanly after the dev-only
 * cleanup pass tears the first subscription down.
 */
function useHydrateWaypoints() {
  useEffect(() => {
    if (useStore.getState().waypoints.length === 0) {
      const stored = loadStoredWaypoints()
      const initial = stored ?? INITIAL_WAYPOINTS
      useStore.getState().setWaypoints(initial)
    }

    const unsub = useStore.subscribe((state, prev) => {
      if (state.waypoints !== prev.waypoints) {
        saveWaypointsToStorage(state.waypoints)
      }
    })
    return unsub
  }, [])
}

/** Ids of the legacy hand-authored seed (scattered near the origin). */
const LEGACY_SEED_IDS = new Set(INITIAL_WAYPOINTS.map((w) => w.id))

/**
 * Once `BuildingsGroup` has measured building footprints, migrate the waypoint
 * set onto the buildings — but only when the user hasn't customized it. We
 * treat the list as "untouched" when it's empty or contains only legacy seed
 * ids; any in-app placement/edit (which mints `wp_<category>_<hex>` or
 * `wp_<building>_*` ids) opts out so we never clobber real work. Runs at most
 * once per session because the replacement ids are no longer all-legacy.
 */
function useReseedWaypointsFromBuildings() {
  const campusBuildings = useStore((s) => s.campusBuildings)

  useEffect(() => {
    const measured = campusBuildings.some((b) => b.cx !== undefined)
    if (!measured) return

    const current = useStore.getState().waypoints
    const untouched =
      current.length === 0 || current.every((w) => LEGACY_SEED_IDS.has(w.id))
    if (!untouched) return

    const generated = generateDummyWaypointsForBuildings(campusBuildings)
    if (generated.length === 0) return
    useStore.getState().setWaypoints(generated)
  }, [campusBuildings])
}

/* ── Placement ground catcher ────────────────────────────────────────── */

const PLACEMENT_PAD = 4
const PLACEMENT_OPACITY = 0.04

/**
 * Invisible-ish plane that captures pointer clicks on the open ground while
 * placement mode is on, so the user can stamp new waypoints anywhere outside
 * a building footprint. Buildings raycast in front of this plane, so clicks
 * landing on a building still select the building normally.
 */
function PlacementGroundCatcher() {
  const setHoveredWaypointId = useStore((s) => s.setHoveredWaypointId)
  const addWaypoint = useStore((s) => s.addWaypoint)
  const setSelectedWaypointId = useStore((s) => s.setSelectedWaypointId)
  const draftCategory = useStore((s) => s.waypointDraftCategory)
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.layers.set(RENDER_LAYERS.INTERACTIVE)
  }, [])

  const { xMin, xMax, zMin, zMax, positionY } = TERRAIN_GROUND_PLANE_BOUNDS
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2
  const w = Math.abs(xMax - xMin) + PLACEMENT_PAD * 2
  const d = Math.abs(zMax - zMin) + PLACEMENT_PAD * 2

  const placeAt = useCallback(
    (point: THREE.Vector3) => {
      const { x, z } = clampToTerrainFootprint(point.x, point.z)
      const id = generateWaypointId(draftCategory as WaypointCategory)
      const wp: Waypoint = {
        id,
        category: draftCategory,
        label: '',
        x,
        z,
        buildingId: null,
      }
      addWaypoint(wp)
      setSelectedWaypointId(id)
    },
    [addWaypoint, draftCategory, setSelectedWaypointId],
  )

  const clickHandlers = useClickDragThreshold((e) => {
    e.stopPropagation()
    placeAt(e.point)
  })

  return (
    <mesh
      ref={meshRef}
      position={[cx, positionY + 0.001, cz]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setPointerCursor(true)
        setHoveredWaypointId(null)
        document.body.style.cursor = 'crosshair'
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setPointerCursor(false)
      }}
      {...clickHandlers}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial
        color="#7CF5C2"
        transparent
        opacity={PLACEMENT_OPACITY}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ── Drag attachment for the selected waypoint ───────────────────────── */

/**
 * Custom events emitted by three-stdlib's `TransformControls` that aren't
 * present in the base `Object3DEventMap`. Narrowing the event-listener API
 * here lets us subscribe without disabling the type-checker globally.
 */
type TransformControlsEvent =
  | 'dragging-changed'
  | 'objectChange'
  | 'mouseUp'

type TransformControlsEventTarget = {
  addEventListener(
    type: TransformControlsEvent,
    listener: (event: { value?: boolean }) => void,
  ): void
  removeEventListener(
    type: TransformControlsEvent,
    listener: (event: { value?: boolean }) => void,
  ): void
}

interface WaypointDragHandlesProps {
  /** Marker root group for the selected waypoint. */
  target: THREE.Group
  waypointId: string
}

/**
 * Translate-only TransformControls bound to the selected marker. Y is hidden
 * and re-snapped on every change so dragging is constrained to XZ even if
 * mouse motion projects into Y. While dragging, the active CameraControls
 * are paused so a click+drag isn't fighting an orbit pan.
 */
function WaypointDragHandles({ target, waypointId }: WaypointDragHandlesProps) {
  const tcRef = useRef<TransformControlsImpl | null>(null)
  const cameraControls = useThree(
    (s) => s.controls,
  ) as CameraControlsImpl | null

  /**
   * The canvas raycaster is locked to `RENDER_LAYERS.INTERACTIVE`, so the
   * TransformControls gizmo + pickers (which sit on layer 0 by default)
   * silently miss every click. Enabling the bit on the whole subtree makes
   * the gizmo handles actually draggable.
   */
  useEffect(() => {
    const tc = tcRef.current
    if (!tc) return
    tc.traverse((child) => {
      child.layers.enable(RENDER_LAYERS.INTERACTIVE)
    })
  }, [target])

  useEffect(() => {
    const tc = tcRef.current
    if (!tc) return

    const handleDraggingChanged = (event: { value?: boolean }) => {
      if (cameraControls) cameraControls.enabled = !event.value
    }

    const handleObjectChange = () => {
      const x = target.position.x
      const z = target.position.z
      target.position.y = snapWaypointYToTerrain(x, z)
    }

    const handleMouseUp = () => {
      const x = target.position.x
      const z = target.position.z
      const ySnap = snapWaypointYToTerrain(x, z)
      target.position.y = ySnap
      const { x: cx, z: cz } = clampToTerrainFootprint(x, z)
      if (cx !== x || cz !== z) {
        target.position.x = cx
        target.position.z = cz
      }
      useStore.getState().updateWaypoint(waypointId, { x: cx, z: cz })
    }

    const events = tc as unknown as TransformControlsEventTarget
    events.addEventListener('dragging-changed', handleDraggingChanged)
    events.addEventListener('objectChange', handleObjectChange)
    events.addEventListener('mouseUp', handleMouseUp)
    return () => {
      events.removeEventListener('dragging-changed', handleDraggingChanged)
      events.removeEventListener('objectChange', handleObjectChange)
      events.removeEventListener('mouseUp', handleMouseUp)
      if (cameraControls) cameraControls.enabled = true
    }
  }, [target, waypointId, cameraControls])

  // drei v10 forwards every TransformControls prop (enabled, showX, showY,
  // showZ, size, mode, …) onto an inner R3F `<primitive>`. Props we omit
  // arrive as `undefined`, which the primitive then **assigns** onto the
  // controls instance — `showX = undefined` hides the X handles *and their
  // pickers* (TransformControls.js#697-700), and `enabled = undefined`
  // makes `if (!this.enabled) return` early-return on every pointer event.
  // Pass every prop we rely on with an explicit defined value.
  return (
    <TransformControls
      ref={tcRef}
      object={target}
      enabled={true}
      mode="translate"
      space="world"
      size={1.1}
      showX={true}
      showY={false}
      showZ={true}
      translationSnap={null}
      rotationSnap={null}
      scaleSnap={null}
    />
  )
}

/* ── WaypointsGroup ─────────────────────────────────────────────────── */

/**
 * Root scene-graph node for all wayfinding pins on campus.
 *
 *   • Hydrates waypoints from localStorage (or seed) on first mount.
 *   • Filters markers by `layers.waypoints` + category filter set.
 *   • Mounts a placement ground catcher while placement mode is on.
 *   • Attaches `<TransformControls>` to the selected marker so the user can
 *     drag it on XZ; Y is re-snapped to terrain on every change.
 *   • Owns a small focus controller that smoothly flies the active
 *     CameraControls to whichever waypoint is selected.
 *
 * Building selection is left entirely to `BuildingsGroup`; waypoint clicks
 * call `stopPropagation()` to prevent the BuildingsGroup root listener from
 * also receiving them.
 */
export function WaypointsGroup() {
  useHydrateWaypoints()
  useReseedWaypointsFromBuildings()

  const visible = useStore((s) => s.layers.waypoints)
  const waypoints = useStore((s) => s.waypoints)
  const selectedWaypointId = useStore((s) => s.selectedWaypointId)
  const hoveredWaypointId = useStore((s) => s.hoveredWaypointId)
  const placementMode = useStore((s) => s.waypointPlacementMode)
  const categoryFilters = useStore((s) => s.waypointCategoryFilters)
  const setSelectedWaypointId = useStore((s) => s.setSelectedWaypointId)

  /** id → group ref. Populated via ref callbacks below; consumed by TransformControls. */
  const markerRefs = useRef<Map<string, THREE.Group>>(new Map())
  /** Forces a re-evaluation of the selected target after refs land. */
  const [targetObject, setTargetObject] = useState<THREE.Group | null>(null)

  const refCallbackFor = useCallback(
    (id: string) => (node: THREE.Group | null) => {
      if (node) markerRefs.current.set(id, node)
      else markerRefs.current.delete(id)
    },
    [],
  )

  /* When selection or placement mode changes, re-lookup the target group. */
  useEffect(() => {
    if (!placementMode || !selectedWaypointId) {
      setTargetObject(null)
      return
    }
    const node = markerRefs.current.get(selectedWaypointId) ?? null
    setTargetObject(node)
  }, [placementMode, selectedWaypointId, waypoints])

  const visibleWaypoints = useMemo(
    () => waypoints.filter((w) => categoryFilters[w.category]),
    [waypoints, categoryFilters],
  )

  const handleMarkerSelect = useCallback(
    (id: string) => {
      setSelectedWaypointId(id)
    },
    [setSelectedWaypointId],
  )

  const resolveState = (id: string): WaypointVisualState => {
    if (selectedWaypointId === id) return 'selected'
    if (hoveredWaypointId === id) return 'hovered'
    return 'base'
  }

  return (
    <group name="WaypointsGroup" visible={visible}>
      {visibleWaypoints.map((wp) => (
        <WaypointMarker
          key={wp.id}
          ref={refCallbackFor(wp.id)}
          waypoint={wp}
          yFloor={snapWaypointYToTerrain(wp.x, wp.z)}
          state={resolveState(wp.id)}
          onSelect={handleMarkerSelect}
        />
      ))}

      {placementMode && <PlacementGroundCatcher />}

      {placementMode && targetObject && selectedWaypointId && (
        <WaypointDragHandles
          target={targetObject}
          waypointId={selectedWaypointId}
        />
      )}
    </group>
  )
}
