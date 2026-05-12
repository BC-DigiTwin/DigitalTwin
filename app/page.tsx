'use client'

import { Canvas } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useCallback, useState } from 'react'

import {
  type BuildingApiData,
  SidePanel,
} from '../src/components/SidePanel'

export default function Home() {
  const [activeBuildingData, setActiveBuildingData] =
    useState<BuildingApiData | null>(null)

  const handleBuildingMeshClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const id = event.object.name
      if (!id) return

      void fetch(`/api/buildings/${encodeURIComponent(id)}`)
        .then((res) => {
          if (!res.ok) return null
          return res.json() as Promise<BuildingApiData>
        })
        .then((data) => {
          if (data) setActiveBuildingData(data)
        })
    },
    [],
  )

  return (
    <main className="relative min-h-screen w-full">
      <div className="fixed inset-0 z-0 h-screen w-screen">
        <Canvas camera={{ position: [4, 3, 6], fov: 50 }}>
          <color attach="background" args={['#0f172a']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[6, 10, 4]} intensity={1.1} />
          <mesh name="building_science" onClick={handleBuildingMeshClick}>
            <boxGeometry args={[1.6, 2.2, 1.2]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.45} />
          </mesh>
        </Canvas>
      </div>

      <SidePanel
        buildingData={activeBuildingData}
        onClose={() => setActiveBuildingData(null)}
      />
    </main>
  )
}
