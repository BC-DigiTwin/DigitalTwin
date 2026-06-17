import { forwardRef, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import {
  WAYPOINT_CATEGORY_META,
  type Waypoint,
} from '../../../lib/mockWaypoints'
import { RENDER_LAYERS } from '../../constants/renderLayers'
import { setPointerCursor } from '../../utils/pointerCursor'
import { useStore } from '../../store/useStore'
import { getWaypointIconTexture } from '../../utils/waypointIcons'
import { useClickDragThreshold } from '../../hooks/useClickDragThreshold'

/**
 * Visible geometry constants — tuned to read on the campus greybox without
 * dominating buildings. Kept here so a single edit changes every marker.
 */
const MARKER_BASE_SCALE = 1.5
const RING_INNER = 1.45
const RING_OUTER = 2.35
const RING_SEGMENTS = 64
/** Soft outer halo — helps pins read as markers when zoomed out. */
const HALO_INNER = 2.55
const HALO_OUTER = 3.35
const BEAM_HEIGHT = 8.5
const BEAM_RADIUS_BOTTOM = 0.22
const BEAM_RADIUS_TOP = 0.07
const BEAM_SEGMENTS = 16
const ICON_SIZE = 2.65
const ICON_Y = 4.6
/** Map view: larger sprite so the category glyph reads when the campus fits in frame. */
const MAP_ICON_SIZE_MULT = 1.55
/** Map view: draw above buildings without affecting orbit depth sorting. */
const MAP_RENDER_ORDER_OFFSET = 250
/** Cylinder hit-box that wraps the entire marker for forgiving click targets. */
const PICKER_RADIUS = 2.75
const PICKER_HEIGHT = 10
/** Category filter hover — beam stretches high and widens for every pin of that type. */
const BEAM_CATEGORY_HEIGHT_MULT = 16
const BEAM_CATEGORY_WIDTH_MULT = 2.28

/* ── Shared beam shader: vertical alpha gradient (additive) ──────────── */

const BEAM_VERTEX_SHADER = /* glsl */ `
  varying float vT;
  void main() {
    vT = uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vT;
  void main() {
    float alpha = pow(1.0 - vT, 1.8) * 0.68 * uIntensity;
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(uColor * (1.0 + uIntensity * 0.4), alpha);
  }
`

/* ── Interaction state ──────────────────────────────────────────────── */

export type WaypointVisualState =
  | 'base'
  | 'hovered'
  | 'selected'
  | 'categoryHighlight'

interface StateScalars {
  /** Multiplies ring + beam emissive intensity. */
  intensity: number
  /** Scale applied to the ring + icon (subtle "pop" on hover/select). */
  scale: number
  /** Frequency (Hz) for the optional pulse (selected only). */
  pulseHz: number
}

const STATE_SCALARS: Record<WaypointVisualState, StateScalars> = {
  base: { intensity: 1.25, scale: 1.0, pulseHz: 0 },
  // Hover: extra pop on top of MARKER_BASE_SCALE so the active pin reads clearly.
  hovered: { intensity: 2.7, scale: 1.65, pulseHz: 2.6 },
  selected: { intensity: 2.4, scale: 1.35, pulseHz: 1.5 },
  // Panel category chip hover — all pins of that type grow together.
  categoryHighlight: { intensity: 2.8, scale: 1.55, pulseHz: 2.2 },
}

function visualScaleForState(state: WaypointVisualState): number {
  return MARKER_BASE_SCALE * STATE_SCALARS[state].scale
}

function beamScaleForState(state: WaypointVisualState): {
  height: number
  width: number
} {
  if (state === 'categoryHighlight') {
    return {
      height: BEAM_CATEGORY_HEIGHT_MULT,
      width: BEAM_CATEGORY_WIDTH_MULT,
    }
  }
  return { height: 1, width: 1 }
}

interface WaypointMarkerProps {
  waypoint: Waypoint
  /** Pre-snapped Y for the ground floor of the marker. */
  yFloor: number
  state: WaypointVisualState
  /**
   * Uniform scale for the whole marker. Map view passes a value > 1 so pins
   * stay legible when the orthographic camera frames the entire campus.
   */
  markerScale?: number
  /** Top-down map mode — pins render on top with a map-tuned icon. */
  mapView?: boolean
  /** Fired after a click that passes the click-vs-drag threshold check. */
  onSelect: (waypointId: string) => void
}

/**
 * Single waypoint visual — a glowing ground ring + soft vertical beam + a
 * billboarded category icon. The picker mesh is the only object on
 * `RENDER_LAYERS.INTERACTIVE`, so visual sub-meshes don't intercept clicks
 * destined for buildings underneath.
 *
 * `userData.waypointId` is attached to both the outer group (so
 * `TransformControls` resolves the marker by id when dragging) and the
 * picker mesh (so a raycast hit can resolve the id directly).
 */
export const WaypointMarker = forwardRef<THREE.Group, WaypointMarkerProps>(
  function WaypointMarker(
    { waypoint, yFloor, state, markerScale = 1, mapView = false, onSelect },
    forwardedRef,
  ) {
    const groupRef = useRef<THREE.Group>(null)
    const visualGroupRef = useRef<THREE.Group>(null)
    const ringRef = useRef<THREE.Mesh>(null)
    const beamRef = useRef<THREE.Mesh>(null)
    const beamMatRef = useRef<THREE.ShaderMaterial>(null)
    const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)
    const haloMatRef = useRef<THREE.MeshBasicMaterial>(null)
    const innerDiscMatRef = useRef<THREE.MeshBasicMaterial>(null)
    const spriteRef = useRef<THREE.Sprite>(null)
    const pickerRef = useRef<THREE.Mesh>(null)

    const color = WAYPOINT_CATEGORY_META[waypoint.category].color
    const colorObj = useMemo(() => new THREE.Color(color), [color])
    const iconTexture = useMemo(
      () =>
        getWaypointIconTexture(
          waypoint.category,
          1,
          mapView ? 'map' : 'default',
        ),
      [waypoint.category, mapView],
    )
    const iconSize = mapView ? ICON_SIZE * MAP_ICON_SIZE_MULT : ICON_SIZE
    const iconY = mapView ? 0.05 : ICON_Y
    const renderOrderOffset = mapView ? MAP_RENDER_ORDER_OFFSET : 0
    const depthTest = !mapView

    /* ── Beam uniforms (kept stable across re-renders) ──────────── */
    const beamUniforms = useMemo(
      () => ({
        uColor: { value: colorObj.clone() },
        uIntensity: { value: STATE_SCALARS[state].intensity },
      }),
      // colorObj/state changes are pushed through refs in the effect below,
      // not via re-creation, so the shader keeps its compiled program.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    )

    /* ── Forward outer ref + attach userData for picker lookup ──── */
    useEffect(() => {
      const g = groupRef.current
      if (!g) return
      g.userData.waypointId = waypoint.id
      g.userData.waypointCategory = waypoint.category
      if (typeof forwardedRef === 'function') {
        forwardedRef(g)
      } else if (forwardedRef) {
        forwardedRef.current = g
      }
    }, [waypoint.id, waypoint.category, forwardedRef])

    /* ── Enable INTERACTIVE only on the picker so the visuals don't
         shadow building raycasts behind them. ─────────────────── */
    useEffect(() => {
      const picker = pickerRef.current
      if (!picker) return
      picker.layers.set(RENDER_LAYERS.INTERACTIVE)
      picker.userData.waypointId = waypoint.id
    }, [waypoint.id])

    /* ── Push state-driven scalars into the materials each render ─ */
    useEffect(() => {
      const scalars = STATE_SCALARS[state]
      const beamScale = beamScaleForState(state)
      const isCategoryHighlight = state === 'categoryHighlight'

      if (ringMatRef.current) {
        ringMatRef.current.color.copy(colorObj)
        ringMatRef.current.opacity = isCategoryHighlight
          ? 1.0
          : state === 'base'
            ? 0.92
            : 1.0
      }
      if (haloMatRef.current) {
        haloMatRef.current.color.copy(colorObj)
        haloMatRef.current.opacity = isCategoryHighlight ? 0.58 : 0.32
      }
      if (innerDiscMatRef.current) {
        innerDiscMatRef.current.color.copy(colorObj)
        innerDiscMatRef.current.opacity = isCategoryHighlight ? 0.55 : 0.38
      }
      if (beamMatRef.current) {
        ;(beamMatRef.current.uniforms.uColor.value as THREE.Color).copy(colorObj)
        beamMatRef.current.uniforms.uIntensity.value = scalars.intensity
      }
      const visualGroup = visualGroupRef.current
      if (visualGroup) {
        visualGroup.scale.setScalar(visualScaleForState(state))
      }
      const sprite = spriteRef.current
      if (sprite) {
        sprite.scale.setScalar(iconSize)
      }
      const beam = beamRef.current
      if (beam) {
        beam.scale.set(beamScale.width, beamScale.height, beamScale.width)
        beam.position.y = (BEAM_HEIGHT * beamScale.height) / 2
      }
    }, [state, colorObj, iconSize])

    /* ── Animated pulse for hovered + selected states ───────────── */
    useFrame(({ clock }) => {
      const scalars = STATE_SCALARS[state]
      const beamScale = beamScaleForState(state)
      const sprite = spriteRef.current
      const visualGroup = visualGroupRef.current
      const beam = beamMatRef.current
      const beamMesh = beamRef.current
      const baseVisualScale = visualScaleForState(state)

      if (scalars.pulseHz <= 0) {
        // Resting state: make sure the icon returns to its base height in
        // case we just left a pulsing (hover/selected) state mid-bob.
        if (sprite) sprite.position.y = iconY
        if (visualGroup) visualGroup.scale.setScalar(baseVisualScale)
        if (beamMesh) {
          beamMesh.scale.set(beamScale.width, beamScale.height, beamScale.width)
          beamMesh.position.y = (BEAM_HEIGHT * beamScale.height) / 2
        }
        return
      }

      const t = clock.elapsedTime
      const pulse = 0.5 + 0.5 * Math.sin(t * scalars.pulseHz * Math.PI * 2)
      const beamHeightPulse =
        state === 'categoryHighlight'
          ? beamScale.height * (1 + pulse * 0.08)
          : beamScale.height
      const beamWidthPulse =
        state === 'categoryHighlight'
          ? beamScale.width * (1 + pulse * 0.06)
          : beamScale.width
      const visualPulse =
        state === 'hovered' || state === 'categoryHighlight'
          ? 1 + pulse * 0.1
          : 1 + pulse * 0.06

      if (beam) {
        beam.uniforms.uIntensity.value = scalars.intensity * (0.8 + pulse * 0.55)
      }
      if (beamMesh) {
        beamMesh.scale.set(beamWidthPulse, beamHeightPulse, beamWidthPulse)
        beamMesh.position.y = (BEAM_HEIGHT * beamHeightPulse) / 2
      }
      if (visualGroup) {
        visualGroup.scale.setScalar(baseVisualScale * visualPulse)
      }
      if (sprite) {
        sprite.position.y = iconY + pulse * 0.6
      }
    })

    /* ── Pointer handlers ───────────────────────────────────────── */

    const handleOver = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setPointerCursor(true)
      useStore.getState().setHoveredWaypointId(waypoint.id)
    }

    const handleOut = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setPointerCursor(false)
      const current = useStore.getState().hoveredWaypointId
      if (current === waypoint.id) {
        useStore.getState().setHoveredWaypointId(null)
      }
    }

    const clickHandlers = useClickDragThreshold((e) => {
      e.stopPropagation()
      onSelect(waypoint.id)
    })

    return (
      <group
        ref={groupRef}
        position={[waypoint.x, yFloor, waypoint.z]}
        scale={markerScale}
        name={`Waypoint:${waypoint.id}`}
      >
        <group ref={visualGroupRef} scale={MARKER_BASE_SCALE}>
        {/* Outer halo — hidden in map view; the sprite carries the pin read. */}
        {!mapView && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1 + renderOrderOffset}
          raycast={() => undefined}
        >
          <ringGeometry args={[HALO_INNER, HALO_OUTER, RING_SEGMENTS]} />
          <meshBasicMaterial
            ref={haloMatRef}
            color={color}
            transparent
            opacity={0.32}
            depthWrite={false}
            depthTest={depthTest}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        )}

        {/* Ground ring — flat, soft glow. depthWrite=false so the beam reads through it. */}
        {!mapView && (
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={3 + renderOrderOffset}
          raycast={() => undefined}
        >
          <ringGeometry args={[RING_INNER, RING_OUTER, RING_SEGMENTS]} />
          <meshBasicMaterial
            ref={ringMatRef}
            color={color}
            transparent
            opacity={0.92}
            depthWrite={false}
            depthTest={depthTest}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        )}

        {/* Inner solid disc — adds a small read on the ground beneath the icon. */}
        {!mapView && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2 + renderOrderOffset}
          raycast={() => undefined}
        >
          <circleGeometry args={[RING_INNER - 0.08, RING_SEGMENTS]} />
          <meshBasicMaterial
            ref={innerDiscMatRef}
            color={color}
            transparent
            opacity={0.38}
            depthWrite={false}
            depthTest={depthTest}
            toneMapped={false}
          />
        </mesh>
        )}

        {/* Vertical beam — additive, fades to 0 at top. */}
        {!mapView && (
        <mesh
          ref={beamRef}
          position={[0, BEAM_HEIGHT / 2, 0]}
          renderOrder={4 + renderOrderOffset}
          raycast={() => undefined}
        >
          <cylinderGeometry
            args={[
              BEAM_RADIUS_TOP,
              BEAM_RADIUS_BOTTOM,
              BEAM_HEIGHT,
              BEAM_SEGMENTS,
              1,
              true,
            ]}
          />
          <shaderMaterial
            ref={beamMatRef}
            vertexShader={BEAM_VERTEX_SHADER}
            fragmentShader={BEAM_FRAGMENT_SHADER}
            uniforms={beamUniforms}
            transparent
            depthWrite={false}
            depthTest={depthTest}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        )}

        {/* Icon sprite — billboards automatically. */}
        <sprite
          ref={spriteRef}
          position={[0, iconY, 0]}
          scale={[iconSize, iconSize, 1]}
          renderOrder={5 + renderOrderOffset}
          raycast={() => undefined}
        >
          <spriteMaterial
            map={iconTexture}
            transparent
            depthWrite={false}
            depthTest={depthTest}
            toneMapped={false}
          />
        </sprite>

        {/* Picker — invisible, only on INTERACTIVE, hit-tests the whole marker. */}
        <mesh
          ref={pickerRef}
          position={[0, (mapView ? iconSize : PICKER_HEIGHT) / 2, 0]}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          {...clickHandlers}
        >
          <cylinderGeometry
            args={[
              mapView ? iconSize * 0.55 : PICKER_RADIUS,
              mapView ? iconSize * 0.55 : PICKER_RADIUS,
              mapView ? iconSize : PICKER_HEIGHT,
              12,
              1,
              true,
            ]}
          />
          <meshBasicMaterial visible={false} transparent opacity={0} />
        </mesh>
        </group>
      </group>
    )
  },
)
