import { useRef, useLayoutEffect, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'
import gsap from 'gsap'

/* ── Static constants (never change at runtime) ───────────────────── */

const TARGET: [number, number, number] = [0, 0, 0]

/** Orbit mode: perspective camera at [0, 50, 50] looking at origin. */
const ORBIT_CAMERA_POSITION: [number, number, number] = [0, 50, 50]

/** Distance from target on the XZ plane in the default orbit view. */
const ORBIT_RADIUS_XZ = Math.hypot(ORBIT_CAMERA_POSITION[0], ORBIT_CAMERA_POSITION[2])

/** Height above target.y in the default orbit view. */
const ORBIT_HEIGHT = ORBIT_CAMERA_POSITION[1]

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

  const { mapHeight, mapViewSize, orbitFov, damping } = settings

  /* ── Refs ─────────────────────────────────────────────────────── */

  const perspCamRef = useRef<THREE.PerspectiveCamera>(null!)
  const orthoCamRef = useRef<THREE.OrthographicCamera>(null!)
  const controlsRef = useRef<ThreeOrbitControls | null>(null)
  const prevModeRef = useRef<CameraMode>(mode)
  const gsapCtxRef = useRef<gsap.Context | null>(null)

  /** Preserved azimuthal angle so Map → Orbit restores the same view. */
  const azimuthRef = useRef<number>(
    Math.atan2(ORBIT_CAMERA_POSITION[0], ORBIT_CAMERA_POSITION[2]),
  )

  /**
   * Snapshot values only consumed at transition-time into refs so the
   * transition effect closure never goes stale.
   */
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  /* ── Mount: set initial camera & create OrbitControls ───────── */
  useLayoutEffect(() => {
    const perspCam = perspCamRef.current
    const orthoCam = orthoCamRef.current
    if (!perspCam || !orthoCam) return

    perspCam.aspect = size.width / size.height
    perspCam.updateProjectionMatrix()

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

  /* ── Scene graph: both cameras always mounted ───────────────── */
  return (
    <>
      <perspectiveCamera
        ref={perspCamRef}
        position={[...ORBIT_CAMERA_POSITION]}
        fov={orbitFov}
        near={0.1}
        far={1000}
      />
      <orthographicCamera
        ref={orthoCamRef}
        position={[0, mapHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        left={-mapViewSize}
        right={mapViewSize}
        top={mapViewSize}
        bottom={-mapViewSize}
        near={0.1}
        far={mapHeight * 2}
        zoom={1}
      />
    </>
  )
}
