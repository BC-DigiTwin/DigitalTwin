import { useProgress } from '@react-three/drei'
import { useStore } from '../store/useStore'
import './LoadingScreen.css'

/**
 * Full-screen HTML overlay that displays asset-loading progress **and**
 * asset-loading errors surfaced by `<AssetErrorBoundary>`.
 *
 * Sits *outside* the `<Canvas>` (plain DOM) so it renders on top of the
 * WebGL viewport.  Fades out automatically once all assets have loaded,
 * but stays visible when `appState === 'error'`.
 *
 * Uses drei's `useProgress` store which tracks every call to `useLoader` /
 * `useGLTF` that is suspended behind a React `<Suspense>` boundary.
 */
export function LoadingScreen() {
  const { active, progress, item, loaded, total } = useProgress()
  const appState = useStore((s) => s.appState)
  const assetError = useStore((s) => s.assetError)
  const setAppState = useStore((s) => s.setAppState)
  const setAssetError = useStore((s) => s.setAssetError)

  const hasError = appState === 'error' && assetError !== null
  const visible = active || hasError

  const fileName = item ? item.split('/').pop() : ''

  function handleRetry() {
    setAssetError(null)
    setAppState('loading')
    window.location.reload()
  }

  return (
    <div className={`loading-overlay ${visible ? 'active' : 'done'}`}>
      <div className="loading-content">
        {hasError ? (
          <>
            <div className="loading-error-icon" aria-hidden>!</div>
            <p className="loading-percentage">Asset failed to load</p>
            <p className="loading-item">{assetError}</p>
            <button
              className="loading-retry-btn"
              onClick={handleRetry}
              type="button"
            >
              Retry
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
