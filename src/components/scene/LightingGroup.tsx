import { useControls } from 'leva'

/**
 * Scene-graph group that owns every light in the scene.
 *
 * Leva exposes the key tuneable values so artists / devs can iterate
 * without touching code.
 */
export function LightingGroup() {
  const {
    'Ambient Intensity': ambientIntensity,
    'Sun Intensity': sunIntensity,
    'Sun Position': sunPosition,
  } = useControls(
    'Lighting',
    {
      'Ambient Intensity': { value: 0.5, min: 0, max: 2, step: 0.05 },
      'Sun Intensity': { value: 1, min: 0, max: 3, step: 0.05 },
      'Sun Position': { value: [2, 5, 2] },
    },
    { collapsed: true },
  )

  return (
    <group name="LightingGroup">
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={sunPosition as [number, number, number]}
        intensity={sunIntensity}
        castShadow
      />
    </group>
  )
}
