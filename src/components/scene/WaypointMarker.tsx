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
const RING_INNER = 0.95
const RING_OUTER = 1.45
const RING_SEGMENTS = 64
const BEAM_HEIGHT = 6
const BEAM_RADIUS_BOTTOM = 0.12
const BEAM_RADIUS_TOP = 0.04
const BEAM_SEGMENTS = 16
const ICON_SIZE = 1.4
const ICON_Y = 3.4
/** Cylinder hit-box that wraps the entire marker for forgiving click targets. */
const PICKER_RADIUS = 1.6
const PICKER_HEIGHT = 7

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
    float alpha = pow(1.0 - vT, 1.8) * 0.55 * uIntensity;
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(uColor * (1.0 + uIntensity * 0.4), alpha);
  }
`

/* ── Interaction state ──────────────────────────────────────────────── */

export type WaypointVisualState = 'base' | 'hovered' | 'selected'

interface StateScalars {
  /** Multiplies ring + beam emissive intensity. */
  intensity: number
  /** Scale applied to the ring + icon (subtle "pop" on hover/select). */
  scale: number
  /** Frequency (Hz) for the optional pulse (selected only). */
  pulseHz: number
}

const STATE_SCALARS: Record<WaypointVisualState, StateScalars> = {
  base: { intensity: 1.0, scale: 1.0, pulseHz: 0 },
  // Hover: large, bright, and a quick lively pulse so it's obvious which
  // marker is under the cursor / hovered row — even from far away.
  hovered: { intensity: 2.7, scale: 1.45, pulseHz: 2.6 },
  selected: { intensity: 2.4, scale: 1.3, pulseHz: 1.5 },
}

interface WaypointMarkerProps {
  waypoint: Waypoint
  /** Pre-snapped Y for the ground floor of the marker. */
  yFloor: number
  state: WaypointVisualState
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
  function WaypointMarker({ waypoint, yFloor, state, onSelect }, forwardedRef) {
    const groupRef = useRef<THREE.Group>(null)
    const ringRef = useRef<THREE.Mesh>(null)
    const beamMatRef = useRef<THREE.ShaderMaterial>(null)
    const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)
    const spriteRef = useRef<THREE.Sprite>(null)
    const pickerRef = useRef<THREE.Mesh>(null)

    const color = WAYPOINT_CATEGORY_META[waypoint.category].color
    const colorObj = useMemo(() => new THREE.Color(color), [color])
    const iconTexture = useMemo(
      () => getWaypointIconTexture(waypoint.category),
      [waypoint.category],
    )

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
      if (ringMatRef.current) {
        ringMatRef.current.color.copy(colorObj)
        ringMatRef.current.opacity = state === 'base' ? 0.78 : 1.0
      }
      if (beamMatRef.current) {
        ;(beamMatRef.current.uniforms.uColor.value as THREE.Color).copy(colorObj)
        beamMatRef.current.uniforms.uIntensity.value = scalars.intensity
      }
      const ring = ringRef.current
      if (ring) {
        ring.scale.setScalar(scalars.scale)
      }
      const sprite = spriteRef.current
      if (sprite) {
        sprite.scale.setScalar(ICON_SIZE * scalars.scale)
      }
    }, [state, colorObj])

    /* ── Animated pulse for hovered + selected states ───────────── */
    useFrame(({ clock }) => {
      const scalars = STATE_SCALARS[state]
      const sprite = spriteRef.current
      const ring = ringRef.current
      const beam = beamMatRef.current

      if (scalars.pulseHz <= 0) {
        // Resting state: make sure the icon returns to its base height in
        // case we just left a pulsing (hover/selected) state mid-bob.
        if (sprite) sprite.position.y = ICON_Y
        return
      }

      const t = clock.elapsedTime
      const pulse = 0.5 + 0.5 * Math.sin(t * scalars.pulseHz * Math.PI * 2)

      if (beam) {
        beam.uniforms.uIntensity.value = scalars.intensity * (0.8 + pulse * 0.55)
      }
      if (ring) {
        ring.scale.setScalar(scalars.scale * (1 + pulse * 0.14))
      }
      if (sprite) {
        sprite.scale.setScalar(ICON_SIZE * scalars.scale * (1 + pulse * 0.12))
        // Gentle vertical bob so the icon visibly "lifts" while active.
        sprite.position.y = ICON_Y + pulse * 0.6
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
        name={`Waypoint:${waypoint.id}`}
      >
        {/* Ground ring — flat, soft glow. depthWrite=false so the beam reads through it. */}
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={3}
          raycast={() => undefined}
        >
          <ringGeometry args={[RING_INNER, RING_OUTER, RING_SEGMENTS]} />
          <meshBasicMaterial
            ref={ringMatRef}
            color={color}
            transparent
            opacity={0.78}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* Inner solid disc — adds a small read on the ground beneath the icon. */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2}
          raycast={() => undefined}
        >
          <circleGeometry args={[RING_INNER - 0.05, RING_SEGMENTS]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Vertical beam — additive, fades to 0 at top. */}
        <mesh
          position={[0, BEAM_HEIGHT / 2, 0]}
          renderOrder={4}
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
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* Icon sprite — billboards automatically. */}
        <sprite
          ref={spriteRef}
          position={[0, ICON_Y, 0]}
          scale={[ICON_SIZE, ICON_SIZE, 1]}
          renderOrder={5}
          raycast={() => undefined}
        >
          <spriteMaterial
            map={iconTexture}
            transparent
            depthWrite={false}
            depthTest={true}
            toneMapped={false}
          />
        </sprite>

        {/* Picker — invisible, only on INTERACTIVE, hit-tests the whole marker. */}
        <mesh
          ref={pickerRef}
          position={[0, PICKER_HEIGHT / 2, 0]}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          {...clickHandlers}
        >
          <cylinderGeometry
            args={[PICKER_RADIUS, PICKER_RADIUS, PICKER_HEIGHT, 12, 1, true]}
          />
          <meshBasicMaterial visible={false} transparent opacity={0} />
        </mesh>
      </group>
    )
  },
)
