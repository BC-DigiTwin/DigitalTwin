import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useControls, button } from 'leva'
import { Perf } from 'r3f-perf'
import { CameraRig, DEFAULT_CAMERA_SETTINGS } from './components/CameraRig'
import {
  CameraControlProvider,
  useCameraControl,
} from './contexts/CameraControlContext'
import { LightingGroup } from './components/scene/LightingGroup'
import { EnvironmentGroup } from './components/scene/EnvironmentGroup'
import { BuildingsGroup } from './components/scene/BuildingsGroup'
import { StressTestGroup } from './components/scene/StressTestGroup'
import { LoadingScreen } from './components/LoadingScreen'
import { useStore, type LayerName } from './store/useStore'
import './App.css'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { DebugWrapper } from './components/DebugWrapper'

/**
 * Leva panel that exposes scene-layer visibility toggles backed by Zustand.
 *
 * Leva owns the checkbox state; changes are pushed one-way into Zustand
 * via `useEffect` so we avoid an infinite onChange → re-render loop.
 */
function LayerToggles() {
  const setLayerVisible = useStore((s) => s.setLayerVisible)
  const initialRef = useRef(useStore.getState().layers)

  const {
    Lighting: lighting,
    Environment: environment,
    Buildings: buildings,
    'Stress Test': stressTest,
  } = useControls(
    'Layer Visibility',
    {
      Lighting: { value: initialRef.current.lighting },
      Environment: { value: initialRef.current.environment },
      Buildings: { value: initialRef.current.buildings },
      'Stress Test': { value: initialRef.current.stressTest },
    },
    { collapsed: false },
  )

  useEffect(() => {
    const entries: [LayerName, boolean][] = [
      ['lighting', lighting],
      ['environment', environment],
      ['buildings', buildings],
      ['stressTest', stressTest],
    ]
    for (const [layer, visible] of entries) {
      setLayerVisible(layer, visible)
    }
  }, [lighting, environment, buildings, stressTest, setLayerVisible])

  return null
}

/**
 * Single Leva `useControls` call for everything camera-related:
 * mode toggle + tuneable settings (FOV, Zoom/ViewSize, Height, etc.).
 */
function CameraRigWithControls() {
  const { mode, toggleMode } = useCameraControl()

  const {
    _mode,
    'Map Height': mapHeight,
    'Map View Size': mapViewSize,
    'Orbit FOV': orbitFov,
    'Transition Speed': transitionSpeed,
    Damping: damping,
  } = useControls('Camera', {
    _mode: { value: mode, editable: false, label: 'Current Mode' },
    'Toggle Mode': button(toggleMode),
    'Map Height': { value: DEFAULT_CAMERA_SETTINGS.mapHeight, min: 20, max: 200, step: 1 },
    'Map View Size': { value: DEFAULT_CAMERA_SETTINGS.mapViewSize, min: 10, max: 150, step: 1 },
    'Orbit FOV': { value: DEFAULT_CAMERA_SETTINGS.orbitFov, min: 10, max: 100, step: 1 },
    'Transition Speed': { value: DEFAULT_CAMERA_SETTINGS.transitionSpeed, min: 0.1, max: 3.0, step: 0.05 },
    Damping: { value: DEFAULT_CAMERA_SETTINGS.damping, min: 0.01, max: 0.5, step: 0.01 },
  }, [mode])

  // Silence unused-var for the read-only mode display
  void _mode

  return (
    <CameraRig
      mode={mode}
      settings={{ mapHeight, mapViewSize, orbitFov, transitionSpeed, damping }}
    />
  )
}

export default function App() {
  return (
    <DebugWrapper>
      <div className="canvas-container">
        {/* HTML overlay — tracks drei's internal loading progress */}
        <LoadingScreen />

        <Canvas
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.outputColorSpace = SRGBColorSpace
          }}
        >
          <CameraControlProvider>
            <Perf position="top-left" minimal={false} />

            <CameraRigWithControls />
            <LayerToggles />

            {/* Non-suspending layers render immediately */}
            <LightingGroup />
            <EnvironmentGroup />
            <StressTestGroup />

            {/* Asset-heavy layers suspend until loaded */}
            <Suspense fallback={null}>
              <BuildingsGroup />
            </Suspense>
          </CameraControlProvider>
        </Canvas>
      </div>
    </DebugWrapper>
  )
}