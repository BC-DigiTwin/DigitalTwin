import { type Vector3 } from '@react-three/fiber'

interface PlaceholderBoxProps {
  /** [width, height, depth] — defaults to a 10×10×10 cube. */
  size?: [number, number, number]
  /** World-space position — defaults to origin. */
  position?: Vector3
  /** Fill colour — defaults to semi-transparent red. */
  color?: string
  /** Fill opacity (0–1). */
  opacity?: number
}

/**
 * Bright-red translucent box with a wireframe overlay.
 *
 * Rendered by `<AssetErrorBoundary>` in place of a model that failed to
 * load.  Pass `size` matching the expected bounding-box of the asset so
 * the placeholder occupies roughly the same volume.
 */
export function PlaceholderBox({
  size = [10, 10, 10],
  position = [0, 0, 0],
  color = '#e74c3c',
  opacity = 0.25,
}: PlaceholderBoxProps) {
  const [w, h, d] = size

  return (
    <group position={position}>
      {/* Translucent fill */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe edges */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  )
}
