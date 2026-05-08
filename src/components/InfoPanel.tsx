import { useStore, selectedEntitySelector } from '../store/useStore'
import { useBuildingMetadata } from '../hooks/useBuildingMetadata'
import { HttpError } from '../api/locationClient'

function SkeletonContent() {
  return (
    <div className="info-panel__skeleton" aria-label="Loading building metadata">
      <div className="info-panel__skeleton-bar info-panel__skeleton-bar--lg" />
      <div className="info-panel__skeleton-bar info-panel__skeleton-bar--md" />
      <div className="info-panel__skeleton-bar" />
      <div className="info-panel__skeleton-bar info-panel__skeleton-bar--sm" />
    </div>
  )
}

export function InfoPanel() {
  const selectedEntity = useStore(selectedEntitySelector)
  const setSelectedEntity = useStore((s) => s.setSelectedEntity)
  const { data, isLoading, error } = useBuildingMetadata(selectedEntity)
  const metadata = data ?? null

  if (!selectedEntity) {
    return null
  }

  const hasNoData =
    error instanceof HttpError
      ? error.status === 404
      : Boolean(error) || !metadata

  return (
    <aside className="info-panel" aria-live="polite">
      <div className="info-panel__header">
        <h2 className="info-panel__title">Building Details</h2>
        <button
          type="button"
          className="info-panel__close"
          onClick={() => setSelectedEntity(null)}
        >
          Close
        </button>
      </div>

      {isLoading ? (
        <SkeletonContent />
      ) : hasNoData ? (
        <p className="info-panel__empty">No Data Available</p>
      ) : (
        <div className="info-panel__content">
          <p>
            <strong>ID:</strong> {String(metadata?.id)}
          </p>
          <p>
            <strong>Name:</strong> {metadata?.name ?? 'N/A'}
          </p>
          <p>
            <strong>Type:</strong> {metadata?.type ?? 'N/A'}
          </p>
          <p>
            <strong>Description:</strong> {metadata?.description || 'N/A'}
          </p>
        </div>
      )}
    </aside>
  )
}
