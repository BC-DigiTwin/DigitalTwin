import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * AppState interface defines the shape of the global application state
 */
export interface AppState {
    debugMode: boolean
    appState: 'initial' | 'loading' | 'ready' | 'error'
}

/**
 * Actions interface defines the setter functions for state updates
 */
export interface AppActions {
    setDebugMode: (mode: boolean) => void
    setAppState: (state: AppState['appState']) => void
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
 * ```
 */
export const useStore = create<Store>()(
    devtools(
        (set) => ({
            // Initial state
            debugMode: false,
            appState: 'initial',

            // Actions
            setDebugMode: (mode: boolean) =>
                set({ debugMode: mode }, false, 'setDebugMode'),

            setAppState: (state: AppState['appState']) =>
                set({ appState: state }, false, 'setAppState'),
        }),
        {
            name: 'TwinCampus-Store', // Name shown in Redux DevTools
        }
    )
)
