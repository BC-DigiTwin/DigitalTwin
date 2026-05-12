import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
    type BlueprintBuildingMaterialSettings,
    BLUEPRINT_BUILDING_DEFAULTS,
    type TerrainGroundMaterialSettings,
    TERRAIN_GROUND_DEFAULTS,
    TERRAIN_GROUND_GRID_COLOR,
    SCENE_BACKGROUND_DEFAULT,
} from '../constants/sceneMaterials'

/* ── Layer visibility ───────────────────────────────────────────── */

/** Every toggleable scene-graph layer. */
export type LayerName =
    | 'buildings'
    | 'terrain'
    | 'stressTest'
    | 'instancedRim'

export interface LayerVisibility {
    buildings: boolean
    terrain: boolean
    stressTest: boolean
    instancedRim: boolean
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
    buildings: true,
    terrain: true,
    stressTest: false,
    instancedRim: false,
}

/* ── Store shape ────────────────────────────────────────────────── */

/**
 * AppState interface defines the shape of the global application state
 */
export interface AppState {
    debugMode: boolean
    /** r3f-perf overlay (top-left FPS / GPU stats). */
    showPerfOverlay: boolean
    appState: 'initial' | 'loading' | 'ready' | 'error'
    assetError: string | null
    hoveredId: string | null
    selectedId: string | null
    layers: LayerVisibility
    blueprintBuildingMaterial: BlueprintBuildingMaterialSettings
    terrainGroundMaterial: TerrainGroundMaterialSettings
    /** Solid grass/ground mesh (can be off while grid stays visible). */
    terrainShowGroundPlane: boolean
    /** Grid lines on the terrain footprint (independent of ground plane). */
    terrainShowGrid: boolean
    terrainGridLineColor: string
    /** Three.js `scene.background` (viewport clear color). */
    sceneBackgroundColor: string
    /** Stress test instanced mesh grid count (see Layer Visibility when stress layer is on). */
    stressTestMeshCount: number
}

/**
 * Actions interface defines the setter functions for state updates
 */
export interface AppActions {
    setDebugMode: (mode: boolean) => void
    setShowPerfOverlay: (show: boolean) => void
    setAppState: (state: AppState['appState']) => void
    setAssetError: (error: string | null) => void
    setHoveredId: (id: string | null) => void
    setSelectedId: (id: string | null) => void
    toggleLayer: (layer: LayerName) => void
    setLayerVisible: (layer: LayerName, visible: boolean) => void
    setBlueprintBuildingMaterial: (partial: Partial<BlueprintBuildingMaterialSettings>) => void
    setTerrainGroundMaterial: (partial: Partial<TerrainGroundMaterialSettings>) => void
    setTerrainShowGroundPlane: (show: boolean) => void
    setTerrainShowGrid: (show: boolean) => void
    setTerrainGridLineColor: (color: string) => void
    setSceneBackgroundColor: (color: string) => void
    setStressTestMeshCount: (count: number) => void
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
            showPerfOverlay: false,
            appState: 'initial',
            assetError: null,
            hoveredId: null,
            selectedId: null,
            layers: { ...DEFAULT_LAYER_VISIBILITY },
            blueprintBuildingMaterial: { ...BLUEPRINT_BUILDING_DEFAULTS },
            terrainGroundMaterial: { ...TERRAIN_GROUND_DEFAULTS },
            terrainShowGroundPlane: true,
            terrainShowGrid: true,
            terrainGridLineColor: TERRAIN_GROUND_GRID_COLOR,
            sceneBackgroundColor: SCENE_BACKGROUND_DEFAULT,
            stressTestMeshCount: 600,

            // Actions
            setDebugMode: (mode: boolean) =>
                set({ debugMode: mode }, false, 'setDebugMode'),

            setShowPerfOverlay: (show: boolean) =>
                set({ showPerfOverlay: show }, false, 'setShowPerfOverlay'),

            setAppState: (state: AppState['appState']) =>
                set({ appState: state }, false, 'setAppState'),

            setAssetError: (error: string | null) =>
                set({ assetError: error }, false, 'setAssetError'),

            setHoveredId: (id: string | null) =>
                set({ hoveredId: id }, false, 'setHoveredId'),

            setSelectedId: (id: string | null) =>
                set({ selectedId: id }, false, 'setSelectedId'),

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

            setBlueprintBuildingMaterial: (partial) =>
                set(
                    (s) => ({
                        blueprintBuildingMaterial: {
                            ...s.blueprintBuildingMaterial,
                            ...partial,
                        },
                    }),
                    false,
                    'setBlueprintBuildingMaterial',
                ),

            setTerrainGroundMaterial: (partial) =>
                set(
                    (s) => ({
                        terrainGroundMaterial: {
                            ...s.terrainGroundMaterial,
                            ...partial,
                        },
                    }),
                    false,
                    'setTerrainGroundMaterial',
                ),

            setTerrainShowGroundPlane: (show) =>
                set({ terrainShowGroundPlane: show }, false, 'setTerrainShowGroundPlane'),

            setTerrainShowGrid: (show) =>
                set({ terrainShowGrid: show }, false, 'setTerrainShowGrid'),

            setTerrainGridLineColor: (color) =>
                set({ terrainGridLineColor: color }, false, 'setTerrainGridLineColor'),

            setSceneBackgroundColor: (color) =>
                set({ sceneBackgroundColor: color }, false, 'setSceneBackgroundColor'),

            setStressTestMeshCount: (count) =>
                set({ stressTestMeshCount: count }, false, 'setStressTestMeshCount'),
        }),
        {
            name: 'TwinCampus-Store', // Name shown in Redux DevTools
        }
    )
)
