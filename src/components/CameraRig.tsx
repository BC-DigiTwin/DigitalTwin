import { useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'
import gsap from 'gsap'

import { useStore } from '../store/useStore'
import {
  SELECTED_BUILDING_LIFT_AMOUNT,
  TERRAIN_GROUND_PLANE_BOUNDS,
} from '../constants/sceneMaterials'

/* ── Static constants (never change at runtime) ───────────────────── */

const TARGET: [number, number, number] = [0, 0, 0]

/**
 * Default orbit load: above the SW corner of the terrain grid (−X, −Z),
 * elevated for a steeper look down toward the campus origin (orbit target).
 */
const ORBIT_CAMERA_POSITION: [number, number, number] = [
  TERRAIN_GROUND_PLANE_BOUNDS.xMin,
  130,
  TERRAIN_GROUND_PLANE_BOUNDS.zMin,
]

/** Distance from target on the XZ plane in the default orbit view. */
const ORBIT_RADIUS_XZ = Math.hypot(
  ORBIT_CAMERA_POSITION[0] - TARGET[0],
  ORBIT_CAMERA_POSITION[2] - TARGET[2],
)

/** Height above target.y in the default orbit view. */
const ORBIT_HEIGHT = ORBIT_CAMERA_POSITION[1] - TARGET[1]

/**
 * Tiny offset used when placing a camera directly above the target so that
 * `lookAt` doesn't hit gimbal-lock at the pole.
 */
const POLE_EPSILON = 0.001

export type CameraMode = 'orbit' | 'map'

/* ── Tuneable settings (driven by Leva in the parent component) ──── */

export interface CameraSettings {
  /** Orthographic camera Y height. */
  mapHeight: number
  /** Orthographic frustum half-extent (covers ±mapViewSize per axis). */
  mapViewSize: number
  /** Perspective camera field-of-view in degrees. */
  orbitFov: number
  /** GSAP transition duration in seconds. */
  transitionSpeed: number
  /** OrbitControls damping factor. */
  damping: number
}

/** Sensible defaults — used when no Leva override is provided. */
export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  mapHeight: 80,
  mapViewSize: 60,
  orbitFov: 50,
  transitionSpeed: 0.8,
  damping: 0.1,
}

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * Apply the correct OrbitControls mapping for the given camera mode.
 * Must be called *after* a GSAP transition completes (inside `onComplete`).
 */
function applyControlMapping(
  controls: ThreeOrbitControls,
  forMode: CameraMode,
): void {
  if (forMode === 'map') {
    controls.enableRotate = false
    controls.screenSpacePanning = true
    controls.minPolarAngle = 0
    controls.maxPolarAngle = 0
    controls.enableZoom = true
  } else {
    controls.enableRotate = true
    controls.screenSpacePanning = false
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
    controls.enableZoom = true
  }

  controls.update()
}

const _buildingFocusBox = new THREE.Box3()
const _buildingFocusOtherBox = new THREE.Box3()
const _focusNewTarget = new THREE.Vector3()
const _focusNewPos = new THREE.Vector3()
const _focusDirToCam = new THREE.Vector3()
const _boundingSphere = new THREE.Sphere()
const _buildCenter = new THREE.Vector3()
const _vRt = new THREE.Vector3()
const _vLeg = new THREE.Vector3()
const _midArcPos = new THREE.Vector3()
const _worldUp = new THREE.Vector3(0, 1, 0)
const _axisX = new THREE.Vector3(1, 0, 0)

/**
 * Angle above the XZ plane for the segment **target → camera**.
 *
 * Positive = camera sits above the target and looks *down* (isometric).
 * Negative = camera sits below the target and looks *up* (hero shot).
 *
 * +30° gives a comfortable isometric-style showcase view: the camera sits
 * well above the lifted building and looks clearly down on it, so the
 * surrounding muted campus reads as context behind the hero.
 */
const BUILDING_FOCUS_ELEVATION_DEG = 30

/** Extra margin so the full building stays inside the frustum. */
const BUILDING_FOCUS_RADIUS_PAD = 1.18

/**
 * Orbit camera always sits at least this far from the building center (plus fit
 * distance if larger) so the fly-in has a longer, more readable path.
 */
const BUILDING_FOCUS_FIXED_ORBIT_DISTANCE = 64

/** Extra yaw at the **end** pose (degrees) so the view swings a bit through the move. */
const BUILDING_FOCUS_END_YAW_DEG = 11

/** Slight sideways lift in the middle of the path (world units) for a subtle arc. */
const BUILDING_FOCUS_ARC_OUT_MIN = 5
const BUILDING_FOCUS_ARC_OUT_FRAC = 0.065

/**
 * Shift the OrbitControls **look target** along camera-right (world space) so the
 * building sits a bit **left** of frame — room for the HTML side panel on the right.
 */
const BUILDING_FOCUS_PANEL_SHIFT_MIN = 3.5
const BUILDING_FOCUS_PANEL_SHIFT_FRAC = 0.16

/**
 * Building-focus moves should feel synced with the selected-building lift.
 * With the default 0.8s transition speed this lands around 0.36s: quick
 * enough to match the 0.2s lift easing without making long camera moves snap.
 */
const BUILDING_FOCUS_DURATION_MULT = 0.45

/** Map: multiply fitted zoom by this (<1 = zoom out more) for breathing room. */
const BUILDING_FOCUS_MAP_ZOOM_FRAC = 0.82

/**
 * Fills `outBox` with the union of world bounds for meshes tagged
 * `userData.buildingId === id`. Returns false when nothing matches.
 */
function computeBuildingWorldBounds(
  root: THREE.Object3D,
  buildingId: string,
  outBox: THREE.Box3,
): boolean {
  let found = false
  root.updateMatrixWorld(true)
  root.traverse((obj) => {
    if (obj.type !== 'Mesh') return
    const mesh = obj as THREE.Mesh
    if (mesh.userData.buildingId !== buildingId) return
    if (!found) {
      outBox.setFromObject(mesh)
      found = true
    } else {
      _buildingFocusOtherBox.setFromObject(mesh)
      outBox.union(_buildingFocusOtherBox)
    }
  })
  return found
}

/**
 * Orbit camera **position** at `outPosition` and OrbitControls **look target** at
 * `outLookTarget` (building center shifted slightly right in screen space so the
 * mesh reads left-of-center for the side panel). Uses fixed minimum distance for a
 * longer move, clamped by fit distance so large buildings still fit.
 */
function computeFittedOrbitPosition(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3,
  azimuthRad: number,
  outLookTarget: THREE.Vector3,
  outPosition: THREE.Vector3,
  /**
   * Extra world-space Y offset to pre-shift the framing center by. When the
   * "selection lift" toggle is on we pass `SELECTED_BUILDING_LIFT_AMOUNT`
   * so the camera arrives where the lifted building will end up; when the
   * toggle is off we pass `0` so framing stays at the base building.
   */
  centerYOffset: number,
): void {
  bounds.getCenter(_buildCenter)
  _buildCenter.y += centerYOffset
  bounds.getBoundingSphere(_boundingSphere)
  const r = Math.max(_boundingSphere.radius, 0.5) * BUILDING_FOCUS_RADIUS_PAD

  const elev = THREE.MathUtils.degToRad(BUILDING_FOCUS_ELEVATION_DEG)
  const cosEl = Math.cos(elev)
  const sinEl = Math.sin(elev)
  const yaw = azimuthRad + THREE.MathUtils.degToRad(BUILDING_FOCUS_END_YAW_DEG)
  const sinAz = Math.sin(yaw)
  const cosAz = Math.cos(yaw)

  _focusDirToCam.set(sinAz * cosEl, sinEl, cosAz * cosEl).normalize()

  const vHalf = THREE.MathUtils.degToRad(camera.fov) * 0.5
  const aspect = Math.max(camera.aspect, 0.01)
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)
  const fitDist = Math.max(r / Math.tan(vHalf), r / Math.tan(hHalf), 8)
  const dist = Math.max(BUILDING_FOCUS_FIXED_ORBIT_DISTANCE, fitDist)

  outPosition.copy(_buildCenter).add(_focusDirToCam.multiplyScalar(dist))

  camera.position.copy(outPosition)
  camera.up.copy(_worldUp)
  camera.lookAt(_buildCenter)
  _vRt.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
  const panelShift = Math.max(BUILDING_FOCUS_PANEL_SHIFT_MIN, r * BUILDING_FOCUS_PANEL_SHIFT_FRAC)
  outLookTarget.copy(_buildCenter).addScaledVector(_vRt, panelShift)
}

function killBuildingFocusTweens(
  controls: ThreeOrbitControls,
  perspCam: THREE.PerspectiveCamera,
  orthoCam: THREE.OrthographicCamera,
): void {
  gsap.killTweensOf(controls.target)
  gsap.killTweensOf(perspCam.position)
  gsap.killTweensOf(orthoCam.position)
  gsap.killTweensOf(orthoCam)
}

/* ── Component ─────────────────────────────────────────────────────── */

interface CameraRigProps {
  mode?: CameraMode
  settings?: CameraSettings
}

/**
 * Camera rig with smooth GSAP-powered transitions between
 * Orbit (perspective) and Map (top-down orthographic) modes.
 *
 * All tuneable parameters come in via the `settings` prop (typically
 * driven by Leva from the parent).
 */
export function CameraRig({
  mode = 'orbit',
  settings = DEFAULT_CAMERA_SETTINGS,
}: CameraRigProps) {
  const gl = useThree((s) => s.gl)
  const set = useThree((s) => s.set)
  const size = useThree((s) => s.size)
  const scene = useThree((s) => s.scene)
  const selectedId = useStore((s) => s.selectedId)

  const { mapHeight, mapViewSize, orbitFov, damping } = settings

  /* ── Refs ─────────────────────────────────────────────────────── */

  const perspCamRef = useRef<THREE.PerspectiveCamera>(null!)
  const orthoCamRef = useRef<THREE.OrthographicCamera>(null!)
  const controlsRef = useRef<ThreeOrbitControls | null>(null)
  const prevModeRef = useRef<CameraMode>(mode)
  const gsapCtxRef = useRef<gsap.Context | null>(null)

  /** Preserved azimuthal angle so Map → Orbit restores the same view. */
  const azimuthRef = useRef<number>(
    Math.atan2(
      ORBIT_CAMERA_POSITION[0] - TARGET[0],
      ORBIT_CAMERA_POSITION[2] - TARGET[2],
    ),
  )

  /**
   * Snapshot values only consumed at transition-time into refs so the
   * transition effect closure never goes stale.
   */
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const orthoCameraPosition = useMemo((): [number, number, number] => [0, mapHeight, 0], [mapHeight])

  /* ── Mount: set initial camera & create OrbitControls ───────── */
  useLayoutEffect(() => {
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current
    if (!perspCam || !orthoCam) return

    perspCam.aspect = size.width / size.height
    perspCam.updateProjectionMatrix()
    perspCam.position.set(
      ORBIT_CAMERA_POSITION[0],
      ORBIT_CAMERA_POSITION[1],
      ORBIT_CAMERA_POSITION[2],
    )

    const activeCam = mode === 'orbit' ? perspCam : orthoCam
    set({ camera: activeCam })

    const controls = new ThreeOrbitControls(activeCam, gl.domElement)
    controls.target.set(...TARGET)
    controls.enableDamping = true
    controls.dampingFactor = damping
    controls.rotateSpeed = 0.5

    applyControlMapping(controls, mode)

    controlsRef.current = controls
    gsapCtxRef.current = gsap.context(() => {})

    return () => {
      gsapCtxRef.current?.revert()
      gsapCtxRef.current = null
      const c = controlsRef.current
      const p = perspCamRef.current
      const o = orthoCamRef.current
      if (c && p && o) killBuildingFocusTweens(c, p, o)
      controls.dispose()
      controlsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Live-update: Perspective FOV ───────────────────────────── */
  useEffect(() => {
    const perspCam = perspCamRef.current
    if (!perspCam) return
    perspCam.fov = orbitFov
    perspCam.updateProjectionMatrix()
  }, [orbitFov])

  /* ── Live-update: Perspective aspect ratio on resize ────────── */
  useEffect(() => {
    const perspCam = perspCamRef.current
    if (!perspCam) return
    perspCam.aspect = size.width / size.height
    perspCam.updateProjectionMatrix()
  }, [size])

  /* ── Live-update: Orthographic frustum ──────────────────────── */
  useEffect(() => {
    const orthoCam = orthoCamRef.current
    if (!orthoCam) return
    orthoCam.left = -mapViewSize
    orthoCam.right = mapViewSize
    orthoCam.top = mapViewSize
    orthoCam.bottom = -mapViewSize
    orthoCam.far = mapHeight * 2
    orthoCam.updateProjectionMatrix()
  }, [mapViewSize, mapHeight])

  /* ── Live-update: Damping factor ────────────────────────────── */
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.dampingFactor = damping
  }, [damping])

  /* ── Per-frame controls update (needed for damping) ─────────── */
  useFrame(() => {
    controlsRef.current?.update()
  })

  /* ── Transition: GSAP "handoff" on mode change ──────────────── */
  useEffect(() => {
    if (prevModeRef.current === mode) return
    prevModeRef.current = mode

    const ctx = gsapCtxRef.current
    const controls = controlsRef.current
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current
    if (!ctx || !controls || !perspCam || !orthoCam) return

    // Read transition-time values from ref (always fresh).
    const { mapHeight: height, transitionSpeed: duration } = settingsRef.current

    // Kill previous transition & create a fresh GSAP context.
    ctx.revert()
    gsapCtxRef.current = gsap.context(() => {})
    const freshCtx = gsapCtxRef.current

    // Read where the user is currently looking.
    const target = controls.target.clone()

    controls.enabled = false

    if (mode === 'map') {
      /* ── Orbit → Map ───────────────────────────────────────── */
      const dx = perspCam.position.x - target.x
      const dz = perspCam.position.z - target.z
      const azimuth = Math.atan2(dx, dz)
      azimuthRef.current = azimuth

      orthoCam.position.set(target.x, height, target.z)
      orthoCam.up.set(-Math.sin(azimuth), 0, -Math.cos(azimuth))
      orthoCam.lookAt(target.x, 0, target.z)
      orthoCam.far = height * 2
      orthoCam.updateProjectionMatrix()

      const flyX = target.x + Math.sin(azimuth) * POLE_EPSILON
      const flyZ = target.z + Math.cos(azimuth) * POLE_EPSILON

      freshCtx.add(() => {
        gsap.to(perspCam.position, {
          x: flyX,
          y: height,
          z: flyZ,
          duration,
          ease: 'power2.inOut',
          onUpdate() {
            perspCam.lookAt(target)
          },
          onComplete() {
            set({ camera: orthoCam })
            controls.object = orthoCam
            controls.target.copy(target)

            applyControlMapping(controls, 'map')
            controls.enabled = true
          },
        })
      })
    } else {
      /* ── Map → Orbit ───────────────────────────────────────── */
      const azimuth = azimuthRef.current

      perspCam.position.set(
        target.x + Math.sin(azimuth) * POLE_EPSILON,
        height,
        target.z + Math.cos(azimuth) * POLE_EPSILON,
      )
      perspCam.up.set(0, 1, 0)
      perspCam.lookAt(target)
      perspCam.updateProjectionMatrix()

      set({ camera: perspCam })
      controls.object = perspCam
      controls.target.copy(target)
      controls.update()

      const orbitX = target.x + Math.sin(azimuth) * ORBIT_RADIUS_XZ
      const orbitY = target.y + ORBIT_HEIGHT
      const orbitZ = target.z + Math.cos(azimuth) * ORBIT_RADIUS_XZ

      freshCtx.add(() => {
        gsap.to(perspCam.position, {
          x: orbitX,
          y: orbitY,
          z: orbitZ,
          duration,
          ease: 'power2.inOut',
          onUpdate() {
            perspCam.lookAt(target)
            controls.update()
          },
          onComplete() {
            applyControlMapping(controls, 'orbit')
            controls.enabled = true
          },
        })
      })
    }
  }, [mode, set])

  /* ── Pan / fly toward selected building (orbit + map) ─────────── */
  useEffect(() => {
    const controls = controlsRef.current
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current

    if (!selectedId) {
      if (controls && perspCam && orthoCam) {
        killBuildingFocusTweens(controls, perspCam, orthoCam)
      }
      return
    }

    if (!controls || !perspCam || !orthoCam) return

    const buildingId = selectedId
    let raf = 0
    let cancelled = false

    const runFocus = (attempt: number) => {
      if (cancelled) return

      if (!computeBuildingWorldBounds(scene, buildingId, _buildingFocusBox)) {
        if (attempt < 12) {
          raf = requestAnimationFrame(() => runFocus(attempt + 1))
        }
        return
      }

      killBuildingFocusTweens(controls, perspCam, orthoCam)

      const { transitionSpeed: duration, mapHeight: height, mapViewSize } =
        settingsRef.current
      // Read at focus-time so toggling the setting between selections takes
      // effect immediately on the next click.
      const liftEnabled = useStore.getState().selectionLiftEnabled
      const centerYOffset = liftEnabled ? SELECTED_BUILDING_LIFT_AMOUNT : 0
      controls.enabled = false

      const orthoActive = controls.object === orthoCam

      if (!orthoActive) {
        const cam = perspCam
        const t = controls.target
        const dx = cam.position.x - t.x
        const dz = cam.position.z - t.z
        const azimuth =
          dx * dx + dz * dz < 1e-4 ? azimuthRef.current : Math.atan2(dx, dz)

        const sx = cam.position.x
        const sy = cam.position.y
        const sz = cam.position.z

        computeFittedOrbitPosition(
          cam,
          _buildingFocusBox,
          azimuth,
          _focusNewTarget,
          _focusNewPos,
          centerYOffset,
        )

        cam.position.set(sx, sy, sz)

        _vLeg.set(_focusNewPos.x - sx, _focusNewPos.y - sy, _focusNewPos.z - sz)
        _vRt.crossVectors(_vLeg, _worldUp)
        if (_vRt.lengthSq() < 1e-6) {
          _vRt.crossVectors(_vLeg, _axisX)
        }
        _vRt.normalize()
        const arcMag = Math.min(
          18,
          Math.max(BUILDING_FOCUS_ARC_OUT_MIN, _vLeg.length() * BUILDING_FOCUS_ARC_OUT_FRAC),
        )
        _midArcPos.set(
          sx + (_focusNewPos.x - sx) * 0.5 + _vRt.x * arcMag,
          sy + (_focusNewPos.y - sy) * 0.5 + _vRt.y * arcMag,
          sz + (_focusNewPos.z - sz) * 0.5 + _vRt.z * arcMag,
        )

        const d = duration * BUILDING_FOCUS_DURATION_MULT
        const tMid = d * 0.46
        const tEnd = d - tMid

        gsap
          .timeline({
            onUpdate() {
              cam.lookAt(controls.target)
              controls.update()
            },
            onComplete() {
              const tt = controls.target
              azimuthRef.current = Math.atan2(cam.position.x - tt.x, cam.position.z - tt.z)
              controls.enabled = true
            },
          })
          .to(
            controls.target,
            {
              x: _focusNewTarget.x,
              y: _focusNewTarget.y,
              z: _focusNewTarget.z,
              duration: d,
              ease: 'power2.inOut',
            },
            0,
          )
          .to(
            cam.position,
            { x: _midArcPos.x, y: _midArcPos.y, z: _midArcPos.z, duration: tMid, ease: 'sine.in' },
            0,
          )
          .to(
            cam.position,
            {
              x: _focusNewPos.x,
              y: _focusNewPos.y,
              z: _focusNewPos.z,
              duration: tEnd,
              ease: 'sine.out',
            },
            tMid,
          )
      } else {
        const cam = orthoCam
        _buildingFocusBox.getCenter(_focusNewTarget)

        const dx = _buildingFocusBox.max.x - _buildingFocusBox.min.x
        const dz = _buildingFocusBox.max.z - _buildingFocusBox.min.z
        const footprint = Math.max(dx, dz, 0.01)
        const margin = 1.22
        const fitZoom = (2 * mapViewSize) / (footprint * margin)
        const targetZoom = THREE.MathUtils.clamp(fitZoom * BUILDING_FOCUS_MAP_ZOOM_FRAC, 0.08, 14)

        cam.updateMatrixWorld(true)
        _vRt.set(1, 0, 0).applyQuaternion(cam.quaternion).normalize()
        const panelShift = Math.max(BUILDING_FOCUS_PANEL_SHIFT_MIN, footprint * 0.14)
        const tx = _focusNewTarget.x + _vRt.x * panelShift
        const tz = _focusNewTarget.z + _vRt.z * panelShift

        const dMap = duration * BUILDING_FOCUS_DURATION_MULT

        gsap
          .timeline({
            onUpdate() {
              cam.lookAt(controls.target.x, 0, controls.target.z)
              cam.updateProjectionMatrix()
              controls.update()
            },
            onComplete() {
              controls.enabled = true
            },
          })
          .to(controls.target, { x: tx, y: 0, z: tz, duration: dMap, ease: 'power2.inOut' }, 0)
          .to(cam.position, { x: tx, y: height, z: tz, duration: dMap, ease: 'power2.inOut' }, 0)
          .to(cam, { zoom: targetZoom, duration: dMap, ease: 'power2.inOut' }, 0)
      }
    }

    raf = requestAnimationFrame(() => runFocus(0))

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (controls && perspCam && orthoCam) {
        killBuildingFocusTweens(controls, perspCam, orthoCam)
      }
    }
  }, [selectedId, scene])

  /* ── Scene graph: both cameras always mounted ───────────────── */
  return (
    <>
      <perspectiveCamera
        ref={perspCamRef}
        fov={orbitFov}
        near={0.1}
        far={1000}
      />
      <orthographicCamera
        ref={orthoCamRef}
        position={orthoCameraPosition}
        rotation={[-Math.PI / 2, 0, 0]}
        left={-mapViewSize}
        right={mapViewSize}
        top={mapViewSize}
        bottom={-mapViewSize}
        near={0.1}
        far={mapHeight * 2}
      />
    </>
  )
}
