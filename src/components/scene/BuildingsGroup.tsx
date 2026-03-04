import { useCallback } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../../store/useStore'
import { useAssetLoader } from '../../hooks/useAssetLoader'
import { useInteractiveLayer } from '../../hooks/useInteractiveLayer'
import { useClickDragThreshold } from '../../hooks/useClickDragThreshold'

const CAMPUS_GLB = '/models/campus_greybox.glb'

/**
 * Scene-graph group that owns every building / structure model.
 *
 * Visibility is driven by the global Zustand `layers.buildings` flag.
 * Loads Developer A's greybox campus GLB and places it at the world
 * origin so all GPS → scene-position math stays consistent.
 *
 * All meshes are added to the INTERACTIVE render layer so the
 * raycaster can hit-test them for selection / hover events.
 * Click events use a drag-threshold check so camera pans are ignored.
 */
export function BuildingsGroup() {
  const visible = useStore((s) => s.layers.buildings)
  const gltf = useAssetLoader(CAMPUS_GLB)

  useInteractiveLayer(gltf.scene)

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const name = e.object.name || e.object.parent?.name || '(unnamed)'
    console.log('[BuildingsGroup] clicked:', name, e.point)
  }, [])

  const clickHandlers = useClickDragThreshold(handleClick)

  return (
    <group name="BuildingsGroup" visible={visible} {...clickHandlers}>
      <primitive object={gltf.scene} />
    </group>
  )
}

useAssetLoader.preload(CAMPUS_GLB)
