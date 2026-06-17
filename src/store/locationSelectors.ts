import { useMemo } from 'react'
import { useLocationStore } from './useLocationStore'
import type { LocationNode } from '../locations/location.schemas'

/**
 * Simple boolean selector for the current view mode.
 */
export function useIsIndoorMode(): boolean {
  return useLocationStore((s) => s.viewMode === 'indoor')
}

export function useIsOutdoorMode(): boolean {
  return useLocationStore((s) => s.viewMode === 'outdoor')
}

export function useActiveLocationId(): string | null {
  return useLocationStore((s) => s.activeLocationId)
}

export function useHoveredLocationId(): string | null {
  return useLocationStore((s) => s.hoveredLocationId)
}

export function useHierarchyStatus(): {
  isLoading: boolean
  error: string | null
} {
  return useLocationStore((s) => ({
    isLoading: s.isLoading,
    error: s.error,
  }))
}

function findNodeById(
  nodes: LocationNode[],
  id: string | null,
): LocationNode | null {
  if (!id) return null

  for (const node of nodes) {
    if (String(node.id) === id) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }

  return null
}

function findAncestorByType(
  nodes: LocationNode[],
  id: string | null,
  targetType: string,
): LocationNode | null {
  if (!id) return null

  const stack: Array<{ node: LocationNode; parent: LocationNode | null }> = []

  for (const node of nodes) {
    stack.push({ node, parent: null })
  }

  const parentById = new Map<string, LocationNode | null>()
  const nodeById = new Map<string, LocationNode>()

  while (stack.length > 0) {
    const { node, parent } = stack.pop() as {
      node: LocationNode
      parent: LocationNode | null
    }

    const key = String(node.id)
    nodeById.set(key, node)
    parentById.set(key, parent)

    if (node.children) {
      for (const child of node.children) {
        stack.push({ node: child, parent: node })
      }
    }
  }

  const start = nodeById.get(id ?? '')
  if (!start) return null

  let current: LocationNode | null = start

  while (current) {
    if (current.type === targetType) {
      return current
    }
    const parent: LocationNode | null =
      parentById.get(String(current.id)) ?? null
    current = parent
  }

  return null
}

/**
 * Returns the currently active location node (if any).
 */
export function useCurrentLocation(): LocationNode | null {
  const activeId = useLocationStore((s) => s.activeLocationId)
  const locations = useLocationStore((s) => s.hierarchy)

  return useMemo(
    () => findNodeById(locations, activeId),
    [locations, activeId],
  )
}

/**
 * Returns the building ancestor for the active location.
 * Assumes backend `type` will be "Building" for building nodes.
 */
export function useCurrentBuilding(): LocationNode | null {
  const activeId = useLocationStore((s) => s.activeLocationId)
  const locations = useLocationStore((s) => s.hierarchy)

  return useMemo(
    () => findAncestorByType(locations, activeId, 'Building'),
    [locations, activeId],
  )
}
