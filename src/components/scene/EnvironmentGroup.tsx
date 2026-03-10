import { useRef } from 'react'
import { useControls } from 'leva'
import type { Group } from 'three'
import { useStore } from '../../store/useStore'
import { useRenderLayer } from '../../hooks/useInteractiveLayer'
import { RENDER_LAYERS } from '../../constants/renderLayers'

/**
 * Scene-graph group that owns environmental / helper visuals:
 * world-origin axes, ground grid, sky, fog, etc.
 *
 * Visibility is driven by the global Zustand `layers.environment` flag.
 * Tagged with `RENDER_LAYERS.ENVIRONMENT` (layer 2) — the raycaster
 * ignores everything here.
 */
export function EnvironmentGroup() {
  const visible = useStore((s) => s.layers.environment)
  const groupRef = useRef<Group>(null)

  useRenderLayer(groupRef.current, RENDER_LAYERS.ENVIRONMENT)

  const {
    'Show Axes': showAxes,
    'Show Grid': showGrid,
    'Grid Size': gridSize,
    'Grid Divisions': gridDivisions,
  } = useControls(
    'Environment',
    {
      'Show Axes': { value: true, label: 'Axes (World Origin)' },
      'Show Grid': { value: true, label: 'Grid (XZ plane)' },
      'Grid Size': { value: 10, min: 5, max: 200, step: 5 },
      'Grid Divisions': { value: 10, min: 2, max: 100, step: 1 },
    },
    { collapsed: true },
  )

  return (
    <group ref={groupRef} name="EnvironmentGroup" visible={visible}>
      {showAxes && <axesHelper args={[3]} />}
      {showGrid && (
        <gridHelper args={[gridSize, gridDivisions, '#444', '#222']} />
      )}
    </group>
  )
}
