// src/App.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* The Canvas is your window into the 3D world */}
      <Canvas>
        {/* Lights allow you to see the 3D objects */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} intensity={1} />

        {/* OrbitControls let you rotate/zoom with the mouse */}
        <OrbitControls />

        {/* A simple mesh (object) */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="mediumpurple" />
        </mesh>
      </Canvas>
    </div>
  )
}