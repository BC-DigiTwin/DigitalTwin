import React from 'react'
import { Leva } from 'leva'
import { Perf } from 'r3f-perf'
import { useStore } from '../store/useStore'

interface DebugWrapperProps {
  children: React.ReactNode
}

/**
 * DebugWrapper component provides developer tooling for the 3D scene.
 * 
 * Features:
 * - Leva GUI controls (conditionally visible based on debugMode)
 * - R3F Performance monitor (conditionally visible based on debugMode)
 * 
 * @example
 * ```tsx
 * <DebugWrapper>
 *   <Canvas>
 *     {/* Your 3D scene content */}
 *   </Canvas>
 * </DebugWrapper>
 * ```
 */
export function DebugWrapper({ children }: DebugWrapperProps) {
  const debugMode = useStore((state) => state.debugMode)

  return (
    <>
      {/* Always render children */}
      {children}

      {/* Conditionally render debug tools */}
      {debugMode && <Perf position="top-left" />}
      <Leva hidden={!debugMode} />
    </>
  )
}
