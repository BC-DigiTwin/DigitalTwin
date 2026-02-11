import { Canvas } from '@react-three/fiber'
import { useControls, button } from 'leva'
import { Perf } from 'r3f-perf'
import { CameraRig, DEFAULT_CAMERA_SETTINGS } from './components/CameraRig'
import {
  CameraControlProvider,
  useCameraControl,
} from './contexts/CameraControlContext'
import './App.css'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { DebugWrapper } from './components/DebugWrapper'

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

function SceneHelpers() {
  const { 'Show Axes': showAxes, 'Show Grid': showGrid } = useControls(
    'Scene Helpers',
    {
      'Show Axes': { value: true, label: 'Axes (World Origin 0,0,0)' },
      'Show Grid': { value: true, label: 'Grid (XZ plane)' },
    },
    { collapsed: false }
  )

  return (
    <>
      {showAxes && <axesHelper args={[3]} />}
      {showGrid && <gridHelper args={[10, 10, '#444', '#222']} />}
    </>
  )
}

/** Temporary stress test: 500+ meshes to verify r3f-perf and frame loop stability. Remove when done. */
function StressTestMeshes() {
  const { enabled, count } = useControls(
    'Stress Test (temporary)',
    {
      enabled: { value: false, label: 'Enable (500+ meshes)' },
      count: {
        value: 600,
        min: 500,
        max: 1200,
        step: 100,
        label: 'Mesh count',
      },
    },
    { collapsed: true }
  )

  if (!enabled) return null

  const side = Math.ceil(Math.sqrt(count))
  const meshes = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / side)
    const col = i % side
    const x = (col - side / 2) * 1.2
    const z = (row - side / 2) * 1.2
    return (
      <mesh key={i} position={[x, 0.5, z]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={`hsl(${(i * 37) % 360}, 60%, 50%)`} />
      </mesh>
    )
  })

  return <group>{meshes}</group>
}

export default function App() {
  return (
    <DebugWrapper>
      <div className="canvas-container">
        {/* The Canvas is your window into the 3D world */}
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

            {/* Lights allow you to see the 3D objects */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[2, 5, 2]} intensity={1} />

            {/* Scene helpers at World Origin (0,0,0) — toggled via Leva */}
            <SceneHelpers />

            {/* Original purple box from develop - kept for reference */}
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="mediumpurple" />
            </mesh>

            {/* Temporary: stress test — enable in Leva to verify r3f-perf & frame stability */}
            <StressTestMeshes />
          </CameraControlProvider>
        </Canvas>
      </div>
    </DebugWrapper>
  )
}