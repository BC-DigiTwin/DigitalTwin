import { useRef, useLayoutEffect, useEffect, useMemo, type MutableRefObject } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'
import gsap from 'gsap'

import { useStore } from '../store/useStore'
import { cameraHeading } from '../utils/cameraHeading'
import {
  SELECTED_BUILDING_LIFT_AMOUNT,
  TERRAIN_GROUND_PLANE_BOUNDS,
} from '../constants/sceneMaterials'

/* ── Static constants (never change at runtime) ───────────────────── */

const TARGET: [number, number, number] = [67.95, 0, -8.35]

/** Default orbit load: tuned overview from the SW side of campus. */
const ORBIT_CAMERA_POSITION: [number, number, number] = [
  -205.46,
  227.45,
  284.91,
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
 *
 * Bindings for orbit-style 3D navigation on trackpad and mouse:
 *   • Map (top-down) — left-drag / one-finger PANS, wheel / two-finger scroll
 *     and pinch ZOOM. Rotation is disabled (meaningless top-down).
 *   • Orbit — left-drag / one-finger ROTATES; Ctrl/Cmd/Shift + left-drag PANS
 *     (OrbitControls' built-in modifier swap). Right-drag also pans. Wheel /
 *     two-finger scroll zoom via the smooth-zoom loop.
 *
 * Mobile (max-width 767px) touch overrides (desktop mouse/trackpad unchanged):
 *   • Orbit — one-finger ROTATE, two-finger PAN (pinch still zooms).
 *   • Map — one-finger ROTATE (bearing only; pitch stays top-down), two-finger PAN.
 */
function applyControlMapping(
  controls: ThreeOrbitControls,
  forMode: CameraMode,
): void {
  const mobile = isMobileViewport()

  if (forMode === 'map') {
    controls.enableRotate = mobile
    controls.screenSpacePanning = true
    controls.minPolarAngle = 0
    controls.maxPolarAngle = 0
    controls.enableZoom = true
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    }
    controls.touches = mobile
      ? {
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }
      : {
          ONE: THREE.TOUCH.PAN,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }
  } else {
    controls.enableRotate = true
    controls.screenSpacePanning = mobile
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
    controls.enableZoom = true
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    }
    controls.touches = mobile
      ? {
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }
      : {
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_ROTATE,
        }
  }

  controls.update()
}

/** Perspective height that matches an orthographic map zoom level. */
function perspectiveHeightForOrthoZoom(
  mapViewSize: number,
  orthoZoom: number,
  tanHalfFov: number,
): number {
  return mapViewSize / (Math.max(orthoZoom, 1e-3) * tanHalfFov)
}
/** Keep world units square on screen by scaling the ortho frustum horizontally. */
function updateOrthoFrustum(
  orthoCam: THREE.OrthographicCamera,
  mapViewSize: number,
  mapHeight: number,
  viewportAspect: number,
): void {
  const aspect = Math.max(viewportAspect, 0.01)
  orthoCam.left = -mapViewSize * aspect
  orthoCam.right = mapViewSize * aspect
  orthoCam.top = mapViewSize
  orthoCam.bottom = -mapViewSize
  orthoCam.far = mapHeight * 2
  orthoCam.updateProjectionMatrix()
}

/** Ortho zoom that fits an XZ footprint with margin (top-down, north-up). */
function orthoFitZoomForFootprint(
  mapViewSize: number,
  viewportAspect: number,
  spanX: number,
  spanZ: number,
  margin: number,
): number {
  const aspect = Math.max(viewportAspect, 0.01)
  return Math.min(
    (2 * mapViewSize * aspect) / (spanX * margin),
    (2 * mapViewSize) / (spanZ * margin),
  )
}

/** Campus center + ortho zoom used by map Home and Orbit → Map. */
function getCampusOverviewFraming(
  mapViewSize: number,
  viewportAspect: number,
): { cx: number; cz: number; zoom: number } {
  const { xMin, xMax, zMin, zMax } = TERRAIN_GROUND_PLANE_BOUNDS
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2
  const spanX = Math.max(Math.abs(xMax - xMin), 1)
  const spanZ = Math.max(Math.abs(zMax - zMin), 1)
  const fitZoom = orthoFitZoomForFootprint(
    mapViewSize,
    viewportAspect,
    spanX,
    spanZ,
    RESET_FIT_MARGIN,
  )
  return {
    cx,
    cz,
    zoom: THREE.MathUtils.clamp(fitZoom, 0.02, 14),
  }
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
/** Camera up when north (−Z) should point to the top of the screen. */
const _northUp = new THREE.Vector3(0, 0, -1)
const _blendUp = new THREE.Vector3()

/**
 * Orient `cam` at its current position toward `target`, blending camera-up from
 * world Y (orbit) toward north-up (map). Must run each frame while position moves.
 */
function applyTransitionLookAt(
  cam: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  /** 0 = orbit up, 1 = north-up map. */
  northBlend: number,
): void {
  _blendUp
    .copy(_worldUp)
    .lerp(_northUp, THREE.MathUtils.clamp(northBlend, 0, 1))
    .normalize()
  cam.up.copy(_blendUp)
  cam.lookAt(target)
}

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
const BUILDING_FOCUS_PANEL_SHIFT_MIN = 7
const BUILDING_FOCUS_PANEL_SHIFT_FRAC = 0.27

/**
 * Mobile bottom sheet: shift the look target toward screen-bottom so the building
 * centers in the visible band above the sheet (matches SidePanel `top-2/5`).
 */
const MOBILE_BOTTOM_SHEET_HEIGHT_FRAC = 0.6

/**
 * World-space look-target shift (along screen-down) so the building sits in the
 * upper viewport band above the mobile bottom sheet instead of dead center.
 */
function mobileBuildingFocusVerticalShift(
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  /** Orbit: camera-to-target distance. Map: ortho visible height at the ground plane. */
  framingSpan: number,
): number {
  const visibleFrac = 1 - MOBILE_BOTTOM_SHEET_HEIGHT_FRAC
  // Slightly above the geometric center of the visible band — leaves headroom for tall meshes.
  const targetBandCenter = visibleFrac * 0.42
  const offsetFromScreenCenter = 0.5 - targetBandCenter

  if (camera instanceof THREE.PerspectiveCamera) {
    const vHalf = THREE.MathUtils.degToRad(camera.fov * 0.5)
    const visibleHeight = 2 * framingSpan * Math.tan(vHalf)
    return offsetFromScreenCenter * visibleHeight
  }

  return offsetFromScreenCenter * framingSpan
}

/** Screen-down in world space (direction a subject moves when pushed toward the top of the viewport). */
function getCameraScreenDown(camera: THREE.Camera, out: THREE.Vector3): THREE.Vector3 {
  camera.getWorldDirection(_focusDirToCam)
  _vRt.crossVectors(_focusDirToCam, camera.up).normalize()
  out.crossVectors(_focusDirToCam, _vRt).normalize()
  return out
}

/** Match Tailwind `max-md` — layout/camera overrides below this width only. */
function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

/**
 * Building-focus moves should feel synced with the selected-building lift.
 * With the default 0.8s transition speed this lands around 0.36s: quick
 * enough to match the 0.2s lift easing without making long camera moves snap.
 */
const BUILDING_FOCUS_DURATION_MULT = 0.45

/** Map: multiply fitted zoom by this (<1 = zoom out more) for breathing room. */
const BUILDING_FOCUS_MAP_ZOOM_FRAC = 0.82

/* ── Waypoint fly-to tuning ────────────────────────────────────────── */

/** Orbit stand-off distance (XZ) from the waypoint. Kept generous so a single
 *  marker frames with surrounding context instead of filling the screen. */
const WAYPOINT_FLYTO_DISTANCE = 100
/** Orbit eye height above the waypoint. */
const WAYPOINT_FLYTO_HEIGHT = 72
/** Map-mode zoom when flying to a single waypoint (gentle — only zooms in if
 *  the current view is wider than this). */
const WAYPOINT_FLYTO_MAP_ZOOM = 1.0

/* ── Reset-to-top-down tuning ──────────────────────────────────────── */

/** Padding multiplier so the whole campus fits with breathing room on reset. */
const RESET_FIT_MARGIN = 1.12

/**
 * Perspective clip planes for the campus footprint (~900 m diagonal).
 * A tight `far` (e.g. 1000) cuts geometry when orbiting/zooming out and reads
 * as a diagonal “black wall”. Logarithmic depth (Canvas) keeps precision with a
 * wide near/far ratio.
 */
const PERSP_CLIP_NEAR = 0.01
const PERSP_CLIP_FAR = 10_000

/* ── Inertial zoom (custom, momentum-based) ────────────────────────────
 * OrbitControls applies wheel dolly instantly (undamped), which feels jumpy on
 * a trackpad and stops dead the moment the wheel goes quiet. Instead we treat
 * the wheel as an impulse on a zoom *velocity* (in log space): each frame
 * integrates the velocity into the camera distance, then applies friction so
 * the zoom carries momentum and glides to a smooth stop — framerate-independent
 * and consistent across mouse + trackpad.
 */

/** Velocity added per pixel of wheel/scroll (log space). Higher = faster zoom. */
const ZOOM_WHEEL_IMPULSE = 0.016
/**
 * Extra zoom strength for a trackpad pinch. Pinch arrives as a `ctrlKey` wheel
 * event with small per-event deltas, so it needs a boost to feel as fast as a
 * mouse wheel / two-finger scroll.
 */
const ZOOM_PINCH_MULTIPLIER = 2.5
/** Velocity decay (1/s). Lower = longer coast; higher = quicker stop. */
const ZOOM_FRICTION = 6.5
/** Clamp on |zoom velocity| so a fast trackpad flick can't run away. */
const ZOOM_MAX_SPEED = 8
/** Perspective dolly distance clamps (world units). */
const ZOOM_MIN_DIST = 3
const ZOOM_MAX_DIST = 2200
/** Orthographic zoom clamps. */
const ZOOM_MIN_ORTHO = 0.04
const ZOOM_MAX_ORTHO = 40

const _zoomOffset = new THREE.Vector3()

/* ── Idle cinematic auto-rotate ────────────────────────────────────────
 * After a long stretch with no user input (and nothing selected) the orbit
 * camera slowly sweeps around the campus so the app looks alive on a projector
 * between interactions. Any input cancels it instantly (see interaction
 * tracking in the mount effect). Only runs in orbit mode — rotating the
 * north-up map would defeat the "straight" map view.
 */
/** Idle time before auto-rotate kicks in (ms). */
const AUTO_ROTATE_IDLE_MS = 10_000
/** Sweep speed (radians/sec) once fully ramped in. */
const AUTO_ROTATE_SPEED = 0.06
/** Seconds to ease the sweep up to full speed so it starts imperceptibly. */
const AUTO_ROTATE_RAMP_S = 2.5

const _autoRotateOffset = new THREE.Vector3()

/* ── Compass heading ───────────────────────────────────────────────────
 * Writes the screen-space angle of world-north into a shared singleton each
 * frame so the HTML compass overlay can point correctly without React churn.
 */
const _northDir = new THREE.Vector3()
const _camQuatInv = new THREE.Quaternion()

function writeCameraHeading(cam: THREE.Object3D): void {
  _northDir.set(0, 0, -1).applyQuaternion(_camQuatInv.copy(cam.quaternion).invert())
  cameraHeading.current = Math.atan2(_northDir.x, _northDir.y)
}

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
  const focusDist = isMobileViewport() ? dist * 1.12 : dist

  outPosition.copy(_buildCenter).add(_focusDirToCam.multiplyScalar(focusDist))

  camera.position.copy(outPosition)
  camera.up.copy(_worldUp)
  camera.lookAt(_buildCenter)
  applyBuildingFocusFramingOffset(camera, r, outLookTarget, _buildCenter, focusDist)
}

/**
 * Desktop: shift look target right so the building sits left-of-center for the side panel.
 * Mobile: keep horizontal centering and shift look target down so the building sits
 * in the upper portion of the viewport above the bottom sheet.
 */
function applyBuildingFocusFramingOffset(
  camera: THREE.PerspectiveCamera,
  framingRadius: number,
  outLookTarget: THREE.Vector3,
  buildCenter: THREE.Vector3,
  cameraDistance: number,
): void {
  if (isMobileViewport()) {
    camera.updateMatrixWorld(true)
    const vShift = mobileBuildingFocusVerticalShift(camera, cameraDistance)
    getCameraScreenDown(camera, _vRt)
    outLookTarget.copy(buildCenter).addScaledVector(_vRt, vShift)
    return
  }

  _vRt.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
  const panelShift = Math.max(
    BUILDING_FOCUS_PANEL_SHIFT_MIN,
    framingRadius * BUILDING_FOCUS_PANEL_SHIFT_FRAC,
  )
  outLookTarget.copy(buildCenter).addScaledVector(_vRt, panelShift)
}

function killBuildingFocusTweens(
  controls: ThreeOrbitControls,
  perspCam: THREE.PerspectiveCamera,
  orthoCam: THREE.OrthographicCamera,
): void {
  gsap.killTweensOf(controls.target)
  gsap.killTweensOf(perspCam.position)
  gsap.killTweensOf(perspCam.quaternion)
  gsap.killTweensOf(orthoCam.position)
  gsap.killTweensOf(orthoCam)
}

/** Stop in-flight mode-transition tweens without reverting completed poses. */
function killModeTransitionTweens(
  controls: ThreeOrbitControls,
  perspCam: THREE.PerspectiveCamera,
): void {
  gsap.killTweensOf(controls.target)
  gsap.killTweensOf(perspCam.position)
  gsap.killTweensOf(perspCam.quaternion)
  gsap.killTweensOf(perspCam)
}

/** Camera pose saved before the first building in a selection session. */
interface PreSelectionCameraSnapshot {
  target: { x: number; y: number; z: number }
  perspPosition: { x: number; y: number; z: number }
  orthoPosition: { x: number; y: number; z: number }
  orthoZoom: number
}

/** Orbit pose saved when entering map mode so toggling back restores it. */
interface SavedOrbitPose {
  target: { x: number; y: number; z: number }
  perspPosition: { x: number; y: number; z: number }
  perspQuaternion: { x: number; y: number; z: number; w: number }
}

function captureSavedOrbitPose(
  controls: ThreeOrbitControls,
  perspCam: THREE.PerspectiveCamera,
  savedRef: MutableRefObject<SavedOrbitPose | null>,
  azimuthRef: MutableRefObject<number>,
): void {
  controls.update()
  perspCam.updateMatrixWorld()
  const t = controls.target
  const p = perspCam.position
  const q = perspCam.quaternion
  savedRef.current = {
    target: { x: t.x, y: t.y, z: t.z },
    perspPosition: { x: p.x, y: p.y, z: p.z },
    perspQuaternion: { x: q.x, y: q.y, z: q.z, w: q.w },
  }
  azimuthRef.current = Math.atan2(p.x - t.x, p.z - t.z)
}

function applySavedOrbitPose(
  controls: ThreeOrbitControls,
  perspCam: THREE.PerspectiveCamera,
  saved: SavedOrbitPose,
  azimuthRef: MutableRefObject<number>,
  damping: number,
): void {
  const wasDamping = controls.enableDamping
  controls.enableDamping = false
  perspCam.up.set(0, 1, 0)
  controls.target.set(saved.target.x, saved.target.y, saved.target.z)
  perspCam.position.set(
    saved.perspPosition.x,
    saved.perspPosition.y,
    saved.perspPosition.z,
  )
  perspCam.quaternion.set(
    saved.perspQuaternion.x,
    saved.perspQuaternion.y,
    saved.perspQuaternion.z,
    saved.perspQuaternion.w,
  )
  controls.update()
  perspCam.updateProjectionMatrix()
  controls.enableDamping = wasDamping
  controls.dampingFactor = damping
  const tt = controls.target
  azimuthRef.current = Math.atan2(
    perspCam.position.x - tt.x,
    perspCam.position.z - tt.z,
  )
}

function capturePreSelectionCamera(
  controls: ThreeOrbitControls,
  perspCam: THREE.PerspectiveCamera,
  orthoCam: THREE.OrthographicCamera,
): PreSelectionCameraSnapshot {
  const t = controls.target
  const pp = perspCam.position
  const op = orthoCam.position
  return {
    target: { x: t.x, y: t.y, z: t.z },
    perspPosition: { x: pp.x, y: pp.y, z: pp.z },
    orthoPosition: { x: op.x, y: op.y, z: op.z },
    orthoZoom: orthoCam.zoom,
  }
}

function restorePreSelectionCamera(
  controls: ThreeOrbitControls,
  perspCam: THREE.PerspectiveCamera,
  orthoCam: THREE.OrthographicCamera,
  snapshot: PreSelectionCameraSnapshot,
  duration: number,
  azimuthRef: MutableRefObject<number>,
  onComplete: () => void,
): void {
  controls.enabled = false
  const orthoActive = controls.object === orthoCam
  const d = duration * BUILDING_FOCUS_DURATION_MULT

  if (!orthoActive) {
    const cam = perspCam
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
          onComplete()
        },
      })
      .to(
        controls.target,
        {
          x: snapshot.target.x,
          y: snapshot.target.y,
          z: snapshot.target.z,
          duration: d,
          ease: 'power2.inOut',
        },
        0,
      )
      .to(
        cam.position,
        {
          x: snapshot.perspPosition.x,
          y: snapshot.perspPosition.y,
          z: snapshot.perspPosition.z,
          duration: d,
          ease: 'power2.inOut',
        },
        0,
      )
  } else {
    const cam = orthoCam
    gsap
      .timeline({
        onUpdate() {
          cam.lookAt(controls.target.x, 0, controls.target.z)
          cam.updateProjectionMatrix()
          controls.update()
        },
        onComplete() {
          controls.enabled = true
          onComplete()
        },
      })
      .to(
        controls.target,
        {
          x: snapshot.target.x,
          y: snapshot.target.y,
          z: snapshot.target.z,
          duration: d,
          ease: 'power2.inOut',
        },
        0,
      )
      .to(
        cam.position,
        {
          x: snapshot.orthoPosition.x,
          y: snapshot.orthoPosition.y,
          z: snapshot.orthoPosition.z,
          duration: d,
          ease: 'power2.inOut',
        },
        0,
      )
      .to(cam, { zoom: snapshot.orthoZoom, duration: d, ease: 'power2.inOut' }, 0)
  }
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
  const selectedEntity = useStore((s) => s.selectedEntity)
  const selectedWaypointId = useStore((s) => s.selectedWaypointId)
  const cameraResetNonce = useStore((s) => s.cameraResetNonce)

  const { mapHeight, mapViewSize, orbitFov, damping } = settings

  /* ── Refs ─────────────────────────────────────────────────────── */

  const perspCamRef = useRef<THREE.PerspectiveCamera>(null!)
  const orthoCamRef = useRef<THREE.OrthographicCamera>(null!)
  const controlsRef = useRef<ThreeOrbitControls | null>(null)
  const prevModeRef = useRef<CameraMode>(mode)
  const gsapCtxRef = useRef<gsap.Context | null>(null)
  /** Zoom velocity (log units/sec) integrated + decayed by the zoom loop. */
  const zoomVelRef = useRef(0)
  /** Timestamp (performance.now) of the last user interaction — drives idle auto-rotate. */
  const lastInteractionRef = useRef(performance.now())

  /** Preserved azimuthal angle so Map → Orbit restores the same view. */
  const azimuthRef = useRef<number>(
    Math.atan2(
      ORBIT_CAMERA_POSITION[0] - TARGET[0],
      ORBIT_CAMERA_POSITION[2] - TARGET[2],
    ),
  )

  /**
   * Orbit / map pose from before the first building in the current selection
   * session. Cleared after the restore animation completes on close.
   */
  const preSelectionCameraRef = useRef<PreSelectionCameraSnapshot | null>(null)

  /** Orbit camera pose from before the last Orbit → Map switch. */
  const savedOrbitPoseRef = useRef<SavedOrbitPose | null>(null)

  /** True while a GSAP orbit ↔ map transition owns the camera. */
  const modeTransitionActiveRef = useRef(false)

  /**
   * Snapshot values only consumed at transition-time into refs so the
   * transition effect closure never goes stale.
   */
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const orthoCameraPosition = useMemo((): [number, number, number] => [0, mapHeight, 0], [mapHeight])

  const viewportAspect = Math.max(size.width / size.height, 0.01)
  const orthoFrustum = useMemo(
    () => ({
      left: -mapViewSize * viewportAspect,
      right: mapViewSize * viewportAspect,
      top: mapViewSize,
      bottom: -mapViewSize,
    }),
    [mapViewSize, viewportAspect],
  )

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
    controls.enablePan = true
    controls.panSpeed = 1.1
    // Wheel zoom is handled by a custom damped loop (see the wheel interceptor
    // below + useFrame); these clamps bound both the smooth zoom and any
    // programmatic moves so you can't dolly through the ground or into orbit.
    controls.minDistance = ZOOM_MIN_DIST
    controls.maxDistance = ZOOM_MAX_DIST
    controls.minZoom = ZOOM_MIN_ORTHO
    controls.maxZoom = ZOOM_MAX_ORTHO

    applyControlMapping(controls, mode)

    // OrbitControls swaps rotate ↔ pan when Ctrl/Cmd/Shift is held during a
    // left-drag (see onMouseDown in OrbitControls.js). With LEFT = ROTATE that
    // gives rotate by default and pan while a modifier is held — no extra
    // mouseButtons toggling needed (doing so double-swaps and breaks pan).

    // Custom smooth zoom: intercept wheel in the CAPTURE phase on window so we
    // run *before* OrbitControls' own (undamped) bubble-phase handler and can
    // stop it. Only canvas-targeted wheels are taken, so HTML panels (Leva,
    // waypoints) keep their native scrolling. `passive:false` lets us
    // preventDefault the browser's pinch/page zoom.
    const onWheelCapture = (e: WheelEvent) => {
      if (e.target !== gl.domElement) return
      const c = controlsRef.current
      if (!c || !c.enabled) return
      lastInteractionRef.current = performance.now()
      e.preventDefault()
      e.stopPropagation()
      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 16
      else if (e.deltaMode === 2) dy *= 100
      // Trackpad pinch comes through as a ctrlKey wheel with tiny deltas — give
      // it extra strength so pinch-to-zoom is as fast as wheel/scroll.
      const impulse = e.ctrlKey
        ? ZOOM_WHEEL_IMPULSE * ZOOM_PINCH_MULTIPLIER
        : ZOOM_WHEEL_IMPULSE
      // Add impulse to the zoom velocity. Negative dy (scroll up / pinch open)
      // → negative velocity → distance shrinks → zoom in. Stacking events
      // build speed for a faster, longer glide.
      zoomVelRef.current = THREE.MathUtils.clamp(
        zoomVelRef.current + dy * impulse,
        -ZOOM_MAX_SPEED,
        ZOOM_MAX_SPEED,
      )
    }
    window.addEventListener('wheel', onWheelCapture, {
      passive: false,
      capture: true,
    })

    // Idle auto-rotate cancellation: any pointer/keyboard input or the start of
    // a drag resets the idle clock so the cinematic sweep only runs when the
    // user has genuinely walked away.
    const markInteraction = () => {
      lastInteractionRef.current = performance.now()
    }
    gl.domElement.addEventListener('pointerdown', markInteraction)
    window.addEventListener('keydown', markInteraction)
    controls.addEventListener('start', markInteraction)

    const onControlsEnd = () => {
      const c = controlsRef.current
      const p = perspCamRef.current
      if (!c || !p || !c.enabled || c.object !== p) return
      if (modeTransitionActiveRef.current) return
      captureSavedOrbitPose(c, p, savedOrbitPoseRef, azimuthRef)
    }
    controls.addEventListener('end', onControlsEnd)

    if (mode === 'orbit') {
      captureSavedOrbitPose(controls, perspCam, savedOrbitPoseRef, azimuthRef)
    }

    controlsRef.current = controls
    // Register the controls in the R3F store so consumers (e.g. the waypoint
    // drag gizmo's <TransformControls>) can find and pause them while dragging.
    // Without this, `useThree(s => s.controls)` is null and a waypoint drag
    // fights camera orbit/pan.
    set({ controls: controls as unknown as THREE.EventDispatcher })
    gsapCtxRef.current = gsap.context(() => {})

    return () => {
      gsapCtxRef.current?.revert()
      gsapCtxRef.current = null
      window.removeEventListener('wheel', onWheelCapture, true)
      gl.domElement.removeEventListener('pointerdown', markInteraction)
      window.removeEventListener('keydown', markInteraction)
      controls.removeEventListener('start', markInteraction)
      controls.removeEventListener('end', onControlsEnd)
      const c = controlsRef.current
      const p = perspCamRef.current
      const o = orthoCamRef.current
      if (c && p && o) killBuildingFocusTweens(c, p, o)
      set({ controls: null })
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
    updateOrthoFrustum(orthoCam, mapViewSize, mapHeight, viewportAspect)
  }, [mapViewSize, mapHeight, viewportAspect])

  /* ── Live-update: Damping factor ────────────────────────────── */
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.dampingFactor = damping
  }, [damping])

  /* ── Per-frame: inertial zoom + controls update ─────────────── */
  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const dt = Math.min(delta, 0.1)

    // Skip custom zoom while a programmatic move owns the camera (controls
    // disabled during GSAP transitions / focus); drop momentum so it doesn't
    // fight the animation when control returns. Do not call controls.update()
    // here — it would snap the camera back to the last OrbitControls spherical
    // state and override GSAP tweens.
    if (!controls.enabled) {
      zoomVelRef.current = 0
      writeCameraHeading(controls.object)
      return
    }

    let vel = zoomVelRef.current
    if (Math.abs(vel) > 1e-4) {
      // Integrate this frame's velocity in log space → multiplicative scale.
      const scale = Math.exp(vel * dt)
      const cam = controls.object

      if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
        _zoomOffset.copy(cam.position).sub(controls.target)
        const rawLen = _zoomOffset.length() * scale
        const len = THREE.MathUtils.clamp(rawLen, ZOOM_MIN_DIST, ZOOM_MAX_DIST)
        // Bleed off momentum when we hit a limit so it doesn't push the wall.
        if (len !== rawLen) vel = 0
        _zoomOffset.setLength(len)
        cam.position.copy(controls.target).add(_zoomOffset)
      } else if ((cam as THREE.OrthographicCamera).isOrthographicCamera) {
        const oc = cam as THREE.OrthographicCamera
        const rawZoom = oc.zoom / scale
        const z = THREE.MathUtils.clamp(rawZoom, ZOOM_MIN_ORTHO, ZOOM_MAX_ORTHO)
        if (z !== rawZoom) vel = 0
        oc.zoom = z
        oc.updateProjectionMatrix()
      }

      // Friction: exponential decay → smooth glide to a stop.
      vel *= Math.exp(-ZOOM_FRICTION * dt)
      if (Math.abs(vel) < 1e-3) vel = 0
      zoomVelRef.current = vel
    }

    // Idle cinematic auto-rotate (orbit only, nothing selected). Eases in from
    // zero so the sweep starts imperceptibly rather than snapping to speed.
    const cam = controls.object
    const isOrbitCam = (cam as THREE.PerspectiveCamera).isPerspectiveCamera
    if (isOrbitCam && Math.abs(zoomVelRef.current) < 1e-4) {
      const s = useStore.getState()
      const idleFor =
        performance.now() - lastInteractionRef.current - AUTO_ROTATE_IDLE_MS
      if (idleFor > 0 && !s.selectedEntity && !s.selectedWaypointId) {
        const ramp = Math.min(idleFor / 1000 / AUTO_ROTATE_RAMP_S, 1)
        const angle = AUTO_ROTATE_SPEED * ramp * dt
        _autoRotateOffset.copy(cam.position).sub(controls.target)
        _autoRotateOffset.applyAxisAngle(_worldUp, angle)
        cam.position.copy(controls.target).add(_autoRotateOffset)
      }
    }

    controls.update()
    writeCameraHeading(controls.object)
  })

  /* ── Transition: GSAP "handoff" on mode change ──────────────── */
  useEffect(() => {
    if (prevModeRef.current === mode) return
    prevModeRef.current = mode

    const controls = controlsRef.current
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current
    if (!controls || !perspCam || !orthoCam) return

    // Read transition-time values from ref (always fresh).
    const { mapHeight: height, transitionSpeed: duration, mapViewSize } =
      settingsRef.current
    // Used to match the perspective ↔ ortho *scale* at the handoff so neither
    // direction "pops" to a different zoom level. The perspective vertical
    // extent at distance d is 2·d·tan(fov/2); the ortho vertical extent is
    // 2·mapViewSize/zoom. Equating the two gives the matching zoom/height.
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(perspCam.fov) / 2)

    // Snapshot orbit pose before killing tweens — gsap.context.revert() would
    // rewind prior transitions and leave perspCam straight down, corrupting the
    // save on the second (and later) Orbit → Map cycles.
    if (mode === 'map' && controls.object === perspCam) {
      captureSavedOrbitPose(controls, perspCam, savedOrbitPoseRef, azimuthRef)
    }

    killModeTransitionTweens(controls, perspCam)
    modeTransitionActiveRef.current = true

    // Read where the user is currently looking.
    const target = controls.target.clone()

    controls.enabled = false

    if (mode === 'map') {
      /* ── Orbit → Map ───────────────────────────────────────── */

      // Frame the whole campus centered, same as map Home and first Map switch.
      const { cx, cz, zoom: targetZoom } = getCampusOverviewFraming(
        mapViewSize,
        perspCam.aspect,
      )

      // Height that matches the ortho overview scale at handoff (avoids a zoom pop).
      const overviewHeight = mapViewSize / (targetZoom * tanHalfFov)
      const endFlyY = Math.max(overviewHeight, height)

      const flyX = cx
      const flyZ = cz + POLE_EPSILON

      orthoCam.position.set(cx, height, cz)
      orthoCam.up.copy(_northUp)
      orthoCam.lookAt(cx, 0, cz)
      updateOrthoFrustum(orthoCam, mapViewSize, height, perspCam.aspect)
      orthoCam.zoom = targetZoom
      orthoCam.far = height * 2
      orthoCam.updateProjectionMatrix()

      gsap
        .timeline({
          onUpdate: function () {
            applyTransitionLookAt(
              perspCam,
              controls.target,
              this.progress(),
            )
          },
          onComplete() {
            set({ camera: orthoCam })
            controls.object = orthoCam
            controls.target.set(cx, 0, cz)

            applyControlMapping(controls, 'map')
            controls.enabled = true
            modeTransitionActiveRef.current = false
          },
        })
        .to(
          controls.target,
          { x: cx, y: 0, z: cz, duration, ease: 'power2.inOut' },
          0,
        )
        .to(
          perspCam.position,
          { x: flyX, y: endFlyY, z: flyZ, duration, ease: 'power2.inOut' },
          0,
        )
    } else {
      /* ── Map → Orbit ───────────────────────────────────────── */
      const { damping: damp } = settingsRef.current
      let restore = savedOrbitPoseRef.current

      if (!restore) {
        const azimuth = azimuthRef.current
        const fallbackPos = {
          x: target.x + Math.sin(azimuth) * ORBIT_RADIUS_XZ,
          y: target.y + ORBIT_HEIGHT,
          z: target.z + Math.cos(azimuth) * ORBIT_RADIUS_XZ,
        }
        _focusNewTarget.set(target.x, target.y, target.z)
        perspCam.position.set(fallbackPos.x, fallbackPos.y, fallbackPos.z)
        perspCam.up.set(0, 1, 0)
        perspCam.lookAt(_focusNewTarget)
        perspCam.updateMatrixWorld()
        restore = {
          target: { x: target.x, y: target.y, z: target.z },
          perspPosition: fallbackPos,
          perspQuaternion: {
            x: perspCam.quaternion.x,
            y: perspCam.quaternion.y,
            z: perspCam.quaternion.z,
            w: perspCam.quaternion.w,
          },
        }
        savedOrbitPoseRef.current = restore
      }

      const endTargetX = restore.target.x
      const endTargetY = restore.target.y
      const endTargetZ = restore.target.z
      const endPosX = restore.perspPosition.x
      const endPosY = restore.perspPosition.y
      const endPosZ = restore.perspPosition.z

      // Match the live ortho map view (pan + zoom) — no jump to campus center or
      // a clamped height, which read as a zoomed-in teleport before the fly-out.
      const mapStartX = orthoCam.position.x
      const mapStartZ = orthoCam.position.z
      const mapStartHeight = Math.max(
        perspectiveHeightForOrthoZoom(mapViewSize, orthoCam.zoom, tanHalfFov),
        20,
      )

      perspCam.position.set(mapStartX, mapStartHeight, mapStartZ + POLE_EPSILON)
      applyTransitionLookAt(
        perspCam,
        _focusNewTarget.set(target.x, 0, target.z),
        1,
      )

      set({ camera: perspCam })
      controls.object = perspCam
      controls.target.copy(target)
      applyControlMapping(controls, 'orbit')

      gsap
        .timeline({
          onUpdate: function () {
            applyTransitionLookAt(
              perspCam,
              controls.target,
              1 - this.progress(),
            )
          },
          onComplete() {
            applySavedOrbitPose(controls, perspCam, restore!, azimuthRef, damp)
            captureSavedOrbitPose(controls, perspCam, savedOrbitPoseRef, azimuthRef)
            applyControlMapping(controls, 'orbit')
            controls.enabled = true
            modeTransitionActiveRef.current = false
          },
        })
        .fromTo(
          controls.target,
          { x: target.x, y: target.y, z: target.z },
          {
            x: endTargetX,
            y: endTargetY,
            z: endTargetZ,
            duration,
            ease: 'power2.inOut',
          },
          0,
        )
        .fromTo(
          perspCam.position,
          { x: mapStartX, y: mapStartHeight, z: mapStartZ + POLE_EPSILON },
          {
            x: endPosX,
            y: endPosY,
            z: endPosZ,
            duration,
            ease: 'power2.inOut',
          },
          0,
        )
    }

    return () => {
      killModeTransitionTweens(controls, perspCam)
      modeTransitionActiveRef.current = false
    }
  }, [mode, set])

  /* ── Pan / fly toward selected building (orbit + map) ─────────── */
  useEffect(() => {
    const controls = controlsRef.current
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current

    if (!controls || !perspCam || !orthoCam) return

    if (!selectedEntity) {
      const snapshot = preSelectionCameraRef.current
      if (snapshot) {
        killBuildingFocusTweens(controls, perspCam, orthoCam)
        const { transitionSpeed: duration } = settingsRef.current
        restorePreSelectionCamera(
          controls,
          perspCam,
          orthoCam,
          snapshot,
          duration,
          azimuthRef,
          () => {
            if (controls.object === perspCam) {
              captureSavedOrbitPose(controls, perspCam, savedOrbitPoseRef, azimuthRef)
            }
            preSelectionCameraRef.current = null
          },
        )
      } else {
        killBuildingFocusTweens(controls, perspCam, orthoCam)
      }
      return () => {
        killBuildingFocusTweens(controls, perspCam, orthoCam)
        // Re-enable in case a focus move was interrupted by a deselect mid-flight
        // (otherwise controls could be left disabled and the camera "frozen").
        controls.enabled = true
      }
    }

    if (!preSelectionCameraRef.current) {
      preSelectionCameraRef.current = capturePreSelectionCamera(controls, perspCam, orthoCam)
    }

    const buildingId = selectedEntity
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
              captureSavedOrbitPose(controls, perspCam, savedOrbitPoseRef, azimuthRef)
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
        // Frame the building with generous context (larger margin = more
        // surroundings visible), then cap the zoom-in so clicking a small
        // building doesn't rocket the map all the way in. We never zoom in more
        // than ~1.7× the current level, with a modest absolute ceiling.
        const margin = 1.8
        const fitZoom = orthoFitZoomForFootprint(
          mapViewSize,
          perspCam.aspect,
          Math.max(dx, 0.01),
          Math.max(dz, 0.01),
          margin,
        )
        const currentZoom = cam.zoom
        const mapZoomFrac = isMobileViewport() ? 0.74 : BUILDING_FOCUS_MAP_ZOOM_FRAC
        const targetZoom = THREE.MathUtils.clamp(
          fitZoom * mapZoomFrac,
          0.08,
          Math.min(3.2, currentZoom * 1.7),
        )

        cam.updateMatrixWorld(true)
        let tx: number
        let tz: number
        if (isMobileViewport()) {
          const orthoVisibleHeight = (2 * mapViewSize) / targetZoom
          const vShift = mobileBuildingFocusVerticalShift(cam, orthoVisibleHeight)
          getCameraScreenDown(cam, _vRt)
          tx = _focusNewTarget.x + _vRt.x * vShift
          tz = _focusNewTarget.z + _vRt.z * vShift
        } else {
          _vRt.set(1, 0, 0).applyQuaternion(cam.quaternion).normalize()
          const panelShift = Math.max(BUILDING_FOCUS_PANEL_SHIFT_MIN, footprint * BUILDING_FOCUS_PANEL_SHIFT_FRAC)
          tx = _focusNewTarget.x + _vRt.x * panelShift
          tz = _focusNewTarget.z + _vRt.z * panelShift
        }

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
  }, [selectedEntity, scene])

  /* ── Fly to the selected waypoint (orbit + map) ───────────────── */
  useEffect(() => {
    if (!selectedWaypointId) {
      // Selected waypoint cleared (reset / deletion mid-flight): make sure the
      // controls aren't left disabled by an interrupted fly-to.
      const c = controlsRef.current
      if (c) c.enabled = true
      return
    }
    const controls = controlsRef.current
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current
    if (!controls || !perspCam || !orthoCam) return

    const wp = useStore
      .getState()
      .waypoints.find((w) => w.id === selectedWaypointId)
    if (!wp) return

    const targetX = wp.x
    const targetZ = wp.z

    killBuildingFocusTweens(controls, perspCam, orthoCam)
    const { transitionSpeed: duration, mapHeight: height } = settingsRef.current
    controls.enabled = false

    const orthoActive = controls.object === orthoCam

    if (!orthoActive) {
      // Orbit: keep the current approach azimuth, glide to a stand-off pose.
      const cam = perspCam
      const dx = cam.position.x - targetX
      const dz = cam.position.z - targetZ
      const distXZ = Math.hypot(dx, dz)
      let nx = 0
      let nz = 1
      if (distXZ >= 1e-3) {
        nx = dx / distXZ
        nz = dz / distXZ
      } else {
        nx = Math.sin(azimuthRef.current)
        nz = Math.cos(azimuthRef.current)
      }
      const eyeX = targetX + nx * WAYPOINT_FLYTO_DISTANCE
      const eyeY = WAYPOINT_FLYTO_HEIGHT
      const eyeZ = targetZ + nz * WAYPOINT_FLYTO_DISTANCE

      gsap
        .timeline({
          onUpdate() {
            cam.lookAt(controls.target)
            controls.update()
          },
          onComplete() {
            captureSavedOrbitPose(controls, perspCam, savedOrbitPoseRef, azimuthRef)
            controls.enabled = true
          },
        })
        .to(
          controls.target,
          { x: targetX, y: 2, z: targetZ, duration, ease: 'power2.inOut' },
          0,
        )
        .to(
          cam.position,
          { x: eyeX, y: eyeY, z: eyeZ, duration, ease: 'power2.inOut' },
          0,
        )
    } else {
      // Map: pan + zoom in on the waypoint, keep the top-down look.
      const cam = orthoCam
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
        .to(
          controls.target,
          { x: targetX, y: 0, z: targetZ, duration, ease: 'power2.inOut' },
          0,
        )
        .to(
          cam.position,
          { x: targetX, y: height, z: targetZ, duration, ease: 'power2.inOut' },
          0,
        )
        .to(
          cam,
          {
            zoom: Math.max(cam.zoom, WAYPOINT_FLYTO_MAP_ZOOM),
            duration,
            ease: 'power2.inOut',
          },
          0,
        )
    }

    return () => {
      if (controls && perspCam && orthoCam) {
        killBuildingFocusTweens(controls, perspCam, orthoCam)
      }
    }
  }, [selectedWaypointId])

  /* ── Home reset: orbit → default corner pose; map → campus overview ── */
  const resetInitRef = useRef(true)
  useEffect(() => {
    if (resetInitRef.current) {
      resetInitRef.current = false
      return
    }
    const controls = controlsRef.current
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current
    if (!controls || !perspCam || !orthoCam) return

    killBuildingFocusTweens(controls, perspCam, orthoCam)

    const { mapHeight: height, transitionSpeed: duration, mapViewSize } =
      settingsRef.current

    const { cx, cz, zoom: targetZoom } = getCampusOverviewFraming(
      mapViewSize,
      perspCam.aspect,
    )

    controls.enabled = false
    const wasOrbit = controls.object === perspCam

    if (wasOrbit) {
      // Orbit home: fly back to the tuned startup pose.
      const [tx, ty, tz] = TARGET
      const [px, py, pz] = ORBIT_CAMERA_POSITION

      gsap
        .timeline({
          onUpdate() {
            perspCam.up.set(0, 1, 0)
            perspCam.lookAt(controls.target.x, controls.target.y, controls.target.z)
          },
          onComplete() {
            captureSavedOrbitPose(controls, perspCam, savedOrbitPoseRef, azimuthRef)
            controls.enabled = true
          },
        })
        .to(
          controls.target,
          { x: tx, y: ty, z: tz, duration, ease: 'power2.inOut' },
          0,
        )
        .to(
          perspCam.position,
          { x: px, y: py, z: pz, duration, ease: 'power2.inOut' },
          0,
        )
    } else {
      // Already top-down: pan + zoom out to the campus overview, north-up.
      const cam = orthoCam
      cam.up.set(0, 0, -1)
      gsap
        .timeline({
          onUpdate() {
            cam.lookAt(controls.target.x, 0, controls.target.z)
            cam.updateProjectionMatrix()
            controls.update()
          },
          onComplete() {
            controls.enabled = true
            azimuthRef.current = 0
          },
        })
        .to(
          controls.target,
          { x: cx, y: 0, z: cz, duration, ease: 'power2.inOut' },
          0,
        )
        .to(
          cam.position,
          { x: cx, y: height, z: cz, duration, ease: 'power2.inOut' },
          0,
        )
        .to(cam, { zoom: targetZoom, duration, ease: 'power2.inOut' }, 0)
    }
  }, [cameraResetNonce, set])

  /* ── Scene graph: both cameras always mounted ───────────────── */
  return (
    <>
      <perspectiveCamera
        ref={perspCamRef}
        fov={orbitFov}
        near={PERSP_CLIP_NEAR}
        far={PERSP_CLIP_FAR}
      />
      <orthographicCamera
        ref={orthoCamRef}
        position={orthoCameraPosition}
        rotation={[-Math.PI / 2, 0, 0]}
        left={orthoFrustum.left}
        right={orthoFrustum.right}
        top={orthoFrustum.top}
        bottom={orthoFrustum.bottom}
        near={0.1}
        far={mapHeight * 2}
      />
    </>
  )
}
