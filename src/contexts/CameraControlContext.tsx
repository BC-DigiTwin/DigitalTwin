import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import type { CameraMode } from '../components/CameraRig'

/* ── Context value ─────────────────────────────────────────────────── */

interface CameraControlContextValue {
  /** Current target mode — CameraRig transitions to this when it changes. */
  mode: CameraMode

  /**
   * Toggle between `'orbit'` and `'map'`.
   *
   * This **only** flips the `mode` state.  It does NOT read or sync the
   * OrbitControls target into React state — that is done imperatively
   * inside `CameraRig` at the moment the transition begins (via
   * `controlsRef.current.target.clone()`).
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
  const [mode, setMode] = useState<CameraMode>(initialMode)

  // toggleMode only flips state — no camera/target logic here.
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'orbit' ? 'map' : 'orbit'))
  }, [])

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
