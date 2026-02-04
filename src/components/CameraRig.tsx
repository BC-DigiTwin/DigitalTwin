import { OrbitControls } from '@react-three/drei'

const TARGET = [0, 0, 0] as const

/** Orbit mode: perspective camera at [0, 50, 50] looking at origin. */
const ORBIT_CAMERA_POSITION = [0, 50, 50] as const

/** Map mode: orthographic camera height (Y) for top-down view. */
const MAP_CAMERA_HEIGHT = 80
/** Half-extent of the orthographic view (view covers 2*MAP_VIEW_SIZE per axis). */
const MAP_VIEW_SIZE = 60

export type CameraMode = 'orbit' | 'map'

/**
 * Camera rig component. Supports 'Orbit' (perspective) and 'Map' (top-down orthographic) modes.
 */
export function CameraRig({ mode = 'orbit' }: { mode?: CameraMode }) {
  if (mode === 'map') {
    return (
      <>
        <orthographicCamera
          makeDefault
          position={[0, MAP_CAMERA_HEIGHT, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          left={-MAP_VIEW_SIZE}
          right={MAP_VIEW_SIZE}
          top={MAP_VIEW_SIZE}
          bottom={-MAP_VIEW_SIZE}
          near={0.1}
          far={MAP_CAMERA_HEIGHT * 2}
          zoom={1}
        />
        <OrbitControls
          target={[...TARGET]}
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={0}
          maxPolarAngle={0}
          rotateSpeed={0.5}
        />
      </>
    )
  }

  return (
    <>
      <perspectiveCamera makeDefault position={[...ORBIT_CAMERA_POSITION]} />
      <OrbitControls
        target={[...TARGET]}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI - 0.1}
        rotateSpeed={0.5}
      />
    </>
  )
}
