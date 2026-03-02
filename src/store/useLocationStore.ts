import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { LocationStore, LocationStoreState } from './locationStore.types'

const INITIAL_STATE: LocationStoreState = {
  hierarchy: [],
  activeLocationId: null,
  hoveredLocationId: null,
  viewMode: 'outdoor',
  isLoading: false,
  error: null,
}

/**
 * Global Location Store powered by Zustand.
 * Uses the shared locationStore interface for state and actions.
 */
export const useLocationStore = create<LocationStore>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,

      setHierarchy: (nodes) =>
        set(
          {
            hierarchy: nodes,
          },
          false,
          'setHierarchy',
        ),

      setActiveLocation: (id) =>
        set(
          {
            activeLocationId: id,
          },
          false,
          'setActiveLocation',
        ),

      setHoveredLocation: (id) =>
        set(
          {
            hoveredLocationId: id,
          },
          false,
          'setHoveredLocation',
        ),

      setViewMode: (mode) =>
        set(
          {
            viewMode: mode,
          },
          false,
          'setViewMode',
        ),

      setLoading: (isLoading) =>
        set(
          {
            isLoading,
          },
          false,
          'setLoading',
        ),

      setError: (error) =>
        set(
          {
            error,
          },
          false,
          'setError',
        ),
    }),
    {
      name: 'LocationStore',
    },
  ),
)

