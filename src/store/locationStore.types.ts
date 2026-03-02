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
