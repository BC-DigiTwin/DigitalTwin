<<<<<<< HEAD
/**
 * Represents a single location node in the hierarchy.
 * Recursive type: children can nest indefinitely.
 */
export interface LocationNode {
  /** Unique identifier for the location */
  id: number;
  /** Name of the location */
  name: string;
  /** Depth in the hierarchy (0 = root) */
  depth: number;
  /** Optional parent location ID (undefined for root nodes) */
  parentId?: number;
  /** Optional type of location (e.g., building, room, etc.) */
  type?: string;
  /** Optional description of the location */
  description?: string;
  /** Child locations (recursive) */
  children?: LocationNode[];
}

/**
 * Global store interface for managing hierarchical locations.
 * Suitable for use in React or other frontends.
 */
export interface LocationStore {
  /** Array of root-level locations */
  locations: LocationNode[];
  /** Whether the location data is currently loading */
  loading: boolean;
  /** Optional error message */
  error?: string;
  /** Add a new location node */
  addLocation(location: LocationNode): void;
  /** Update an existing location node */
  updateLocation(location: LocationNode): void;
  /** Delete a location node by ID */
  deleteLocation(id: number): void;
  /** Get a location node by ID */
  getLocationById(id: number): LocationNode | undefined;
}
=======
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

>>>>>>> origin/develop
