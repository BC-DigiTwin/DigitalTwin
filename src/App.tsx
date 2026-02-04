import { Canvas } from '@react-three/fiber'
import { useControls } from 'leva'
import { Perf } from 'r3f-perf'
import { CameraRig, type CameraMode } from './components/CameraRig'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

function CameraRigWithControls() {
  const { mode } = useControls('Camera', {
    mode: { value: 'orbit', options: { Orbit: 'orbit', Map: 'map' } },
  })
  return <CameraRig mode={mode as CameraMode} />
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
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* The Canvas is your window into the 3D world */}
      <Canvas
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.outputColorSpace = SRGBColorSpace
        }}
      >
        <Perf position="top-left" minimal={false} />

        <CameraRigWithControls />

        {/* Lights allow you to see the 3D objects */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} intensity={1} />

        {/* Scene helpers at World Origin (0,0,0) — toggled via Leva */}
        <SceneHelpers />

        {/* Temporary: stress test — enable in Leva to verify r3f-perf & frame stability */}
        <StressTestMeshes />

        {/* A simple mesh (object) */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="mediumpurple" />
        </mesh>
      </Canvas>
    </div>
  )
}