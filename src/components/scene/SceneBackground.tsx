import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

/**
 * Syncs Zustand `sceneBackgroundColor` to `THREE.Scene.background` every frame the color changes.
 */
export function SceneBackground() {
  const backgroundColor = useStore((s) => s.sceneBackgroundColor)
  const scene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    scene.background = new THREE.Color(backgroundColor)
  }, [scene, backgroundColor])

  return null
}
