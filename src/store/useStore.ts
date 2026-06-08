import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
    type BlueprintBuildingMaterialSettings,
    BLUEPRINT_BUILDING_DEFAULTS,
    type AuxBuildingMaterialSettings,
    AUX_BUILDING_MATERIAL_DEFAULTS,
    type TerrainGroundMaterialSettings,
    TERRAIN_GROUND_DEFAULTS,
    type RoadMaterialSettings,
    ROADS_MATERIAL_DEFAULTS,
    TERRAIN_GROUND_GRID_COLOR,
    SCENE_BACKGROUND_DEFAULT,
    SELECTION_SOLID_BODY_COLOR_DEFAULT,
    SELECTION_SOLID_GLOW_DEFAULT,
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
    selectedEntity: string | null
    layers: LayerVisibility
    blueprintBuildingMaterial: BlueprintBuildingMaterialSettings
    auxBuildingMaterial: AuxBuildingMaterialSettings
    terrainGroundMaterial: TerrainGroundMaterialSettings
    roadsMaterial: RoadMaterialSettings
    /** Campus road network visibility (independent of layer toggles). */
    roadsVisible: boolean
    /** Solid grass/ground mesh (can be off while grid stays visible). */
    terrainShowGroundPlane: boolean
    /** Grid lines on the terrain footprint (independent of ground plane). */
    terrainShowGrid: boolean
    terrainGridLineColor: string
    /** Three.js `scene.background` (viewport clear color). */
    sceneBackgroundColor: string
    /** Stress test instanced mesh grid count (see Layer Visibility when stress layer is on). */
    stressTestMeshCount: number
    /**
     * When `true`, selecting a building lifts it upward and slowly rotates it.
     * When `false`, the selected building stays at its base position and
     * orientation (matches the original pre-showcase behavior).
     */
    selectionLiftEnabled: boolean
    /**
     * When `true`, the *other* buildings fade to a muted appearance while one
     * building is selected (lower opacity, dimmer glow, lighter edges).
     * When `false`, unselected buildings keep their normal look.
     */
    selectionMuteOthersEnabled: boolean
    /**
     * When `true`, the selected building’s body fades to fully opaque (solid).
     * When `false`, the selected building keeps the lighter translucent
     * blueprint look (`INTERACTION_STATE_COLORS.SELECTED.bodyOpacity`).
     */
    selectionSolidSelectedEnabled: boolean
    /** Body fill (hex) for the opaque “solid selected” style. */
    selectionSolidBodyColor: string
    /** Rim + emissive + hero edges for solid selected (uses SELECTED interaction tuning). */
    selectionSolidGlowEnabled: boolean
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
    setSelectedEntity: (id: string | null) => void
    setSelectedId: (id: string | null) => void
    toggleLayer: (layer: LayerName) => void
    setLayerVisible: (layer: LayerName, visible: boolean) => void
    setBlueprintBuildingMaterial: (partial: Partial<BlueprintBuildingMaterialSettings>) => void
    setAuxBuildingMaterial: (partial: Partial<AuxBuildingMaterialSettings>) => void
    setTerrainGroundMaterial: (partial: Partial<TerrainGroundMaterialSettings>) => void
    setRoadsMaterial: (partial: Partial<RoadMaterialSettings>) => void
    setRoadsVisible: (visible: boolean) => void
    setTerrainShowGroundPlane: (show: boolean) => void
    setTerrainShowGrid: (show: boolean) => void
    setTerrainGridLineColor: (color: string) => void
    setSceneBackgroundColor: (color: string) => void
    setStressTestMeshCount: (count: number) => void
    setSelectionLiftEnabled: (enabled: boolean) => void
    setSelectionMuteOthersEnabled: (enabled: boolean) => void
    setSelectionSolidSelectedEnabled: (enabled: boolean) => void
    setSelectionSolidBodyColor: (color: string) => void
    setSelectionSolidGlowEnabled: (enabled: boolean) => void
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
            selectedEntity: null,
            layers: { ...DEFAULT_LAYER_VISIBILITY },
            blueprintBuildingMaterial: { ...BLUEPRINT_BUILDING_DEFAULTS },
            auxBuildingMaterial: { ...AUX_BUILDING_MATERIAL_DEFAULTS },
            terrainGroundMaterial: { ...TERRAIN_GROUND_DEFAULTS },
            roadsMaterial: { ...ROADS_MATERIAL_DEFAULTS },
            roadsVisible: true,
            terrainShowGroundPlane: false,
            terrainShowGrid: true,
            terrainGridLineColor: TERRAIN_GROUND_GRID_COLOR,
            sceneBackgroundColor: SCENE_BACKGROUND_DEFAULT,
            stressTestMeshCount: 600,
            selectionLiftEnabled: true,
            selectionMuteOthersEnabled: true,
            selectionSolidSelectedEnabled: false,
            selectionSolidBodyColor: SELECTION_SOLID_BODY_COLOR_DEFAULT,
            selectionSolidGlowEnabled: SELECTION_SOLID_GLOW_DEFAULT,

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

            setSelectedEntity: (id: string | null) =>
                set({ selectedEntity: id }, false, 'setSelectedEntity'),

            setSelectedId: (id: string | null) =>
                set({ selectedEntity: id }, false, 'setSelectedId'),

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

            setAuxBuildingMaterial: (partial) =>
                set(
                    (s) => ({
                        auxBuildingMaterial: {
                            ...s.auxBuildingMaterial,
                            ...partial,
                        },
                    }),
                    false,
                    'setAuxBuildingMaterial',
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

            setRoadsMaterial: (partial) =>
                set(
                    (s) => ({
                        roadsMaterial: {
                            ...s.roadsMaterial,
                            ...partial,
                        },
                    }),
                    false,
                    'setRoadsMaterial',
                ),

            setRoadsVisible: (visible) =>
                set({ roadsVisible: visible }, false, 'setRoadsVisible'),

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

            setSelectionLiftEnabled: (enabled) =>
                set({ selectionLiftEnabled: enabled }, false, 'setSelectionLiftEnabled'),

            setSelectionMuteOthersEnabled: (enabled) =>
                set(
                    { selectionMuteOthersEnabled: enabled },
                    false,
                    'setSelectionMuteOthersEnabled',
                ),

            setSelectionSolidSelectedEnabled: (enabled) =>
                set(
                    { selectionSolidSelectedEnabled: enabled },
                    false,
                    'setSelectionSolidSelectedEnabled',
                ),

            setSelectionSolidBodyColor: (color) =>
                set({ selectionSolidBodyColor: color }, false, 'setSelectionSolidBodyColor'),

            setSelectionSolidGlowEnabled: (enabled) =>
                set(
                    { selectionSolidGlowEnabled: enabled },
                    false,
                    'setSelectionSolidGlowEnabled',
                ),
        }),
        {
            name: 'TwinCampus-Store', // Name shown in Redux DevTools
        }
    )
)

export const selectedEntitySelector = (state: AppState): string | null =>
    state.selectedEntity
