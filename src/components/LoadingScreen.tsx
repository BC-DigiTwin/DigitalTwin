import { useProgress } from '@react-three/drei'
import './LoadingScreen.css'

/**
 * Full-screen HTML overlay that displays asset-loading progress.
 *
 * Sits *outside* the `<Canvas>` (plain DOM) so it renders on top of the
 * WebGL viewport.  Fades out automatically once all assets have loaded.
 *
 * Uses drei's `useProgress` store which tracks every call to `useLoader` /
 * `useGLTF` that is suspended behind a React `<Suspense>` boundary.
 */
export function LoadingScreen() {
  const { active, progress, item, loaded, total } = useProgress()

  // Extract just the filename from the full path for display
  const fileName = item ? item.split('/').pop() : ''

  return (
    <div className={`loading-overlay ${active ? 'active' : 'done'}`}>
      <div className="loading-content">
        <div className="loading-spinner" />

        <div className="loading-progress-bar">
          <div
            className="loading-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="loading-percentage">{progress.toFixed(0)}%</p>

        {fileName && (
          <p className="loading-item">
            Loading {fileName} ({loaded}/{total})
          </p>
        )}
      </div>
    </div>
  )
}
