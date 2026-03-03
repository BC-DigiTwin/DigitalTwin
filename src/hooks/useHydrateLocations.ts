import { useEffect, useRef } from 'react'
import { fetchLocationHierarchy } from '../api/hierarchyClient'
import { useLocationStore } from '../store/useLocationStore'
import type { LocationNode } from '../locations/location.schemas'

function normalizeIds(nodes: LocationNode[]): LocationNode[] {
  return nodes.map((node) => ({
    ...node,
    id: typeof node.id === 'number' ? String(node.id) : node.id,
    parent_id:
      node.parent_id != null && typeof node.parent_id === 'number'
        ? String(node.parent_id)
        : node.parent_id,
    children: node.children ? normalizeIds(node.children) : undefined,
  }))
}

/**
 * Hydrates the global location store with the hierarchy from the API.
 * Call once at app root (e.g. in App) so the tree is loaded on mount.
 */
export function useHydrateLocations() {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const setHierarchy = useLocationStore.getState().setHierarchy
    const setLoading = useLocationStore.getState().setLoading
    const setError = useLocationStore.getState().setError

    setLoading(true)
    setError(null)

    fetchLocationHierarchy()
      .then((raw) => {
        const normalized = normalizeIds(raw)
        setHierarchy(normalized)
        setLoading(false)
        setError(null)
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load location hierarchy'
        setError(message)
        setLoading(false)
      })
  }, [])
}
