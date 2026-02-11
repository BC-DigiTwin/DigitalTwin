import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/* ── Layer visibility ───────────────────────────────────────────── */

/** Every toggleable scene-graph layer. */
export type LayerName = 'lighting' | 'environment' | 'buildings' | 'stressTest'

export interface LayerVisibility {
    lighting: boolean
    environment: boolean
    buildings: boolean
    stressTest: boolean
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
    lighting: true,
    environment: true,
    buildings: true,
    stressTest: false,
}

/* ── Store shape ────────────────────────────────────────────────── */

/**
 * AppState interface defines the shape of the global application state
 */
export interface AppState {
    debugMode: boolean
    appState: 'initial' | 'loading' | 'ready' | 'error'
    layers: LayerVisibility
}

/**
 * Actions interface defines the setter functions for state updates
 */
export interface AppActions {
    setDebugMode: (mode: boolean) => void
    setAppState: (state: AppState['appState']) => void
    toggleLayer: (layer: LayerName) => void
    setLayerVisible: (layer: LayerName, visible: boolean) => void
}

/**
 * Combined store type including both state and actions
 */
type Store = AppState & AppActions

/**
 * Zustand store hook with devtools middleware for browser inspection
 * 
 * @example
 * ```tsx
 * const { appState, setAppState } = useStore()
 * const layers = useStore((s) => s.layers)
 * ```
 */
export const useStore = create<Store>()(
    devtools(
        (set) => ({
            // Initial state
            debugMode: true,
            appState: 'initial',
            layers: { ...DEFAULT_LAYER_VISIBILITY },

            // Actions
            setDebugMode: (mode: boolean) =>
                set({ debugMode: mode }, false, 'setDebugMode'),

            setAppState: (state: AppState['appState']) =>
                set({ appState: state }, false, 'setAppState'),

            toggleLayer: (layer: LayerName) =>
                set(
                    (s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } }),
                    false,
                    `toggleLayer/${layer}`,
                ),

            setLayerVisible: (layer: LayerName, visible: boolean) =>
                set(
                    (s) => ({ layers: { ...s.layers, [layer]: visible } }),
                    false,
                    `setLayerVisible/${layer}`,
                ),
        }),
        {
            name: 'TwinCampus-Store', // Name shown in Redux DevTools
        }
    )
)
