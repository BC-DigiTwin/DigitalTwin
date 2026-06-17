import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { CameraMode } from '../components/CameraRig'
import { useStore } from '../store/useStore'

/* ── Context value ─────────────────────────────────────────────────── */

interface CameraControlContextValue {
  /** Current target mode — CameraRig transitions to this when it changes. */
  mode: CameraMode

  /**
   * Toggle between `'orbit'` and `'map'`.
   *
   * This **only** flips the `mode` state.  It does NOT read or sync the
   * camera look target into React state — that is done imperatively
   * inside `CameraRig` at the moment the transition begins (via
   * `controlsRef.current.getTarget(...)`).
   */
  toggleMode: () => void
}

const CameraControlContext = createContext<CameraControlContextValue | null>(
  null,
)

/* ── Provider ──────────────────────────────────────────────────────── */

interface CameraControlProviderProps {
  children: ReactNode
  /** Starting camera mode. Defaults to `'orbit'`. */
  initialMode?: CameraMode
}

/**
 * Provides camera mode state and a `toggleMode` action to the subtree.
 *
 * Place this **inside** the R3F `<Canvas>` so that `CameraRig` and any
 * other 3D components can consume it.
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <CameraControlProvider>
 *     <CameraRig />
 *     <Scene />
 *   </CameraControlProvider>
 * </Canvas>
 * ```
 */
export function CameraControlProvider({
  children,
  initialMode = 'orbit',
}: CameraControlProviderProps) {
  // Camera mode lives in the Zustand store so HTML overlays *outside* the
  // Canvas (e.g. a reset-view button) can drive it too, not just components
  // inside the R3F tree. The context keeps the same `{ mode, toggleMode }`
  // shape so existing consumers are unchanged.
  const mode = useStore((s) => s.cameraMode) as CameraMode
  const toggleMode = useStore((s) => s.toggleCameraMode)
  const setCameraMode = useStore((s) => s.setCameraMode)

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (initialMode !== useStore.getState().cameraMode) {
      setCameraMode(initialMode)
    }
  }, [initialMode, setCameraMode])

  return (
    <CameraControlContext.Provider value={{ mode, toggleMode }}>
      {children}
    </CameraControlContext.Provider>
  )
}

/* ── Hook ──────────────────────────────────────────────────────────── */

/**
 * Access the current camera `mode` and the `toggleMode` action.
 *
 * Must be used inside a `<CameraControlProvider>`.
 */
export function useCameraControl(): CameraControlContextValue {
  const ctx = useContext(CameraControlContext)
  if (!ctx) {
    throw new Error(
      'useCameraControl must be used within a <CameraControlProvider>',
    )
  }
  return ctx
}
