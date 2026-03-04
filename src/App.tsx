import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
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
import { PathwaysGroup } from './components/scene/PathwaysGroup'
import { TerrainGroup } from './components/scene/TerrainGroup'
import { StressTestGroup } from './components/scene/StressTestGroup'
import { InstancedRimExample } from './components/scene/InstancedRimExample'
import { LoadingScreen } from './components/LoadingScreen'
import { useStore, type LayerName } from './store/useStore'
import './App.css'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { DebugWrapper } from './components/DebugWrapper'
import { AssetErrorBoundary } from './components/AssetErrorBoundary'
import { PlaceholderBox } from './components/PlaceholderBox'
import { RimLightMaterial } from './components/scene/RimLightMaterial'
import { useHydrateLocations } from './hooks/useHydrateLocations'
import { setPointerCursor } from './utils/pointerCursor'

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
    Pathways: pathways,
    Terrain: terrain,
    'Stress Test': stressTest,
    'Instanced Rim': instancedRim,
  } = useControls(
    'Layer Visibility',
    {
      Lighting: { value: initialRef.current.lighting },
      Environment: { value: initialRef.current.environment },
      Buildings: { value: initialRef.current.buildings },
      Pathways: { value: initialRef.current.pathways },
      Terrain: { value: initialRef.current.terrain },
      'Stress Test': { value: initialRef.current.stressTest },
      'Instanced Rim': { value: initialRef.current.instancedRim ?? false },
    },
    { collapsed: false },
  )

  useEffect(() => {
    const entries: [LayerName, boolean][] = [
      ['lighting', lighting],
      ['environment', environment],
      ['buildings', buildings],
      ['pathways', pathways],
      ['terrain', terrain],
      ['stressTest', stressTest],
      ['instancedRim', instancedRim],
    ]
    for (const [layer, visible] of entries) {
      setLayerVisible(layer, visible)
    }
  }, [lighting, environment, buildings, pathways, terrain, stressTest, instancedRim, setLayerVisible])

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
  useHydrateLocations()

  const [debugCubeHovered, setDebugCubeHovered] = useState(false)

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
            <TerrainGroup />
            <PathwaysGroup />
            <StressTestGroup />
            <InstancedRimExample />

            {/* Asset-heavy layers suspend until loaded; errors are caught
                and surfaced via the HTML overlay (LoadingScreen).
                The fallback box approximates the campus model footprint. */}
            <AssetErrorBoundary
              fallback={<PlaceholderBox size={[80, 12, 80]} />}
            >
              <Suspense fallback={null}>
                <BuildingsGroup />
              </Suspense>
            </AssetErrorBoundary>

            {/* Debug: Simple test cube at origin to verify rendering (rim light + pulse) */}
            <mesh
              position={[0, 5, 0]}
              onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation()
                setPointerCursor(true)
                setDebugCubeHovered(true)
              }}
              onPointerOut={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation()
                setPointerCursor(false)
                setDebugCubeHovered(false)
              }}
            >
              <boxGeometry args={[5, 5, 5]} />
              <RimLightMaterial
                color="orange"
                uColor="#00ffff"
                uIntensity={debugCubeHovered ? 1 : 0}
                uPulseSpeed={2}
              />
            </mesh>
          </CameraControlProvider>
        </Canvas>
      </div>
    </DebugWrapper>
  )
}