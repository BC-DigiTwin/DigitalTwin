import { useControls } from 'leva'
import { useStore } from '../../store/useStore'

/**
 * Scene-graph group that owns environmental / helper visuals:
 * world-origin axes, ground grid, sky, fog, etc.
 *
 * Visibility is driven by the global Zustand `layers.environment` flag.
 * Everything here is non-interactive scenery that helps orient the
 * viewer without being a "building" or model asset.
 */
export function EnvironmentGroup() {
  const visible = useStore((s) => s.layers.environment)

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
    <group name="EnvironmentGroup" visible={visible}>
      {showAxes && <axesHelper args={[3]} />}
      {showGrid && (
        <gridHelper args={[gridSize, gridDivisions, '#444', '#222']} />
      )}
    </group>
  )
}
