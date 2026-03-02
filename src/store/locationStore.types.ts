import type { LocationNode } from '../locations/location.schemas'

export type ViewMode = 'indoor' | 'outdoor'

/**
 * TypeScript description of the global Location Store state.
 * This is implementation-agnostic (does not depend on Zustand),
 * so both frontend and shared code can rely on it.
 */
export interface LocationStoreState {
  
  //Full location hierarchy tree as returned by GET /api/hierarchy. 
  hierarchy: LocationNode[]
 
  // Currently active location node identifier, or null when none is selected. 
  activeLocationId: string | null

  // Location that is currently hovered (for highlighting), or null.
  hoveredLocationId: string | null
  
  // High-level visualization mode for the scene. 
  viewMode: ViewMode
 
  // Async loading state for fetching the hierarchy.
  isLoading: boolean
 
  // Error message, if the last hierarchy fetch failed.
  error: string | null
}

/**
 * Interface for all mutating operations on the Location Store.
 * Later steps will wire these up to Zustand actions.
 */
export interface LocationStoreActions {
  setHierarchy(nodes: LocationNode[]): void
  setActiveLocation(id: string | null): void
  setHoveredLocation(id: string | null): void
  setViewMode(mode: ViewMode): void
  setLoading(isLoading: boolean): void
  setError(error: string | null): void
}


//Convenience type for the complete Location Store contract.
export type LocationStore = LocationStoreState & LocationStoreActions

