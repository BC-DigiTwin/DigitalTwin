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
import {
    WAYPOINT_CATEGORIES,
    type Waypoint,
    type WaypointCategory,
} from '../../lib/mockWaypoints'

/* ── Layer visibility ───────────────────────────────────────────── */

/** Every toggleable scene-graph layer. */
export type LayerName =
    | 'buildings'
    | 'terrain'
    | 'stressTest'
    | 'instancedRim'
    | 'waypoints'

/** Camera framing mode. `orbit` = perspective; `map` = top-down orthographic. */
export type CameraViewMode = 'orbit' | 'map'

export interface LayerVisibility {
    buildings: boolean
    terrain: boolean
    stressTest: boolean
    instancedRim: boolean
    waypoints: boolean
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
    buildings: true,
    terrain: true,
    stressTest: false,
    instancedRim: false,
    waypoints: true,
}

/* ── Waypoint filter defaults ───────────────────────────────────── */

/** All categories visible by default. */
const DEFAULT_WAYPOINT_CATEGORY_FILTERS: Record<WaypointCategory, boolean> =
    Object.fromEntries(
        WAYPOINT_CATEGORIES.map((c) => [c, true]),
    ) as Record<WaypointCategory, boolean>

/* ── Campus building registry ───────────────────────────────────── */

/**
 * Lightweight identity for a building present in the loaded GLB. Published by
 * `BuildingsGroup` at runtime (derived from mesh `userData.buildingId`) so UI
 * that groups by building — e.g. the waypoints panel — reflects whatever
 * buildings the current model contains, not a hardcoded list. This keeps the
 * waypoint feature correct as teammates add buildings to the model.
 */
export interface CampusBuilding {
    id: string
    name: string
    /**
     * World-space footprint center X (meters). Present once `BuildingsGroup`
     * has measured the building's combined geometry bounds. Used to place
     * waypoints *inside* a building rather than at arbitrary scattered coords.
     */
    cx?: number
    /** World-space footprint center Z (meters). */
    cz?: number
    /** Half-width of the footprint along X (meters). */
    halfX?: number
    /** Half-depth of the footprint along Z (meters). */
    halfZ?: number
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

    /* ── Waypoints ──────────────────────────────────────────────── */

    /** All loaded campus waypoints (seed + in-app placements + edits). */
    waypoints: Waypoint[]
    /** Currently focused waypoint (drives panel highlight + camera fly-to). */
    selectedWaypointId: string | null
    /** Mouseover waypoint id; updated imperatively from marker pointer events. */
    hoveredWaypointId: string | null
    /** When true, the placement ground catcher is mounted and TransformControls attach to the selected waypoint. */
    waypointPlacementMode: boolean
    /** Category assigned to NEW waypoints created via placement mode click. */
    waypointDraftCategory: WaypointCategory
    /** Per-category visibility filter — markers + list rows are hidden when off. */
    waypointCategoryFilters: Record<WaypointCategory, boolean>
    /**
     * Buildings discovered in the loaded model (id + display name), published
     * by `BuildingsGroup`. Used for waypoint grouping + building assignment so
     * the UI tracks the model rather than a static list.
     */
    campusBuildings: CampusBuilding[]

    /* ── Camera ─────────────────────────────────────────────────── */

    /** Active camera framing mode; `CameraRig` transitions when this changes. */
    cameraMode: CameraViewMode
    /**
     * Bumped to request a "reset to default top-down" framing. `CameraRig`
     * watches the value (not the count) and re-frames the whole campus.
     */
    cameraResetNonce: number
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

    /* ── Waypoint actions ───────────────────────────────────────── */

    /** Replace the entire list (used on hydration). */
    setWaypoints: (list: Waypoint[]) => void
    addWaypoint: (waypoint: Waypoint) => void
    /** Patch a waypoint by id; no-op when id missing. */
    updateWaypoint: (id: string, partial: Partial<Omit<Waypoint, 'id'>>) => void
    removeWaypoint: (id: string) => void
    setSelectedWaypointId: (id: string | null) => void
    setHoveredWaypointId: (id: string | null) => void
    setWaypointPlacementMode: (on: boolean) => void
    setWaypointDraftCategory: (category: WaypointCategory) => void
    toggleWaypointCategoryFilter: (category: WaypointCategory) => void
    setWaypointCategoryFilter: (category: WaypointCategory, on: boolean) => void
    /** Replace the discovered-building registry (called from BuildingsGroup). */
    setCampusBuildings: (list: CampusBuilding[]) => void

    /* ── Camera actions ─────────────────────────────────────────── */

    setCameraMode: (mode: CameraViewMode) => void
    toggleCameraMode: () => void
    /** Request a reset to the default top-down overview (clears selection). */
    requestCameraReset: () => void
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

            // Waypoint state
            waypoints: [],
            selectedWaypointId: null,
            hoveredWaypointId: null,
            waypointPlacementMode: false,
            waypointDraftCategory: 'accessibility',
            waypointCategoryFilters: { ...DEFAULT_WAYPOINT_CATEGORY_FILTERS },
            campusBuildings: [],

            // Camera state
            cameraMode: 'orbit',
            cameraResetNonce: 0,

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

            /* ── Waypoint actions ──────────────────────────────── */

            setWaypoints: (list) =>
                set({ waypoints: list }, false, 'setWaypoints'),

            addWaypoint: (waypoint) =>
                set(
                    (s) => ({ waypoints: [...s.waypoints, waypoint] }),
                    false,
                    'addWaypoint',
                ),

            updateWaypoint: (id, partial) =>
                set(
                    (s) => {
                        const idx = s.waypoints.findIndex((w) => w.id === id)
                        if (idx === -1) return s
                        const next = s.waypoints.slice()
                        next[idx] = { ...next[idx], ...partial, id: next[idx].id }
                        return { waypoints: next }
                    },
                    false,
                    'updateWaypoint',
                ),

            removeWaypoint: (id) =>
                set(
                    (s) => ({
                        waypoints: s.waypoints.filter((w) => w.id !== id),
                        selectedWaypointId:
                            s.selectedWaypointId === id ? null : s.selectedWaypointId,
                        hoveredWaypointId:
                            s.hoveredWaypointId === id ? null : s.hoveredWaypointId,
                    }),
                    false,
                    'removeWaypoint',
                ),

            setSelectedWaypointId: (id) =>
                set({ selectedWaypointId: id }, false, 'setSelectedWaypointId'),

            setHoveredWaypointId: (id) =>
                set({ hoveredWaypointId: id }, false, 'setHoveredWaypointId'),

            setWaypointPlacementMode: (on) =>
                set({ waypointPlacementMode: on }, false, 'setWaypointPlacementMode'),

            setWaypointDraftCategory: (category) =>
                set(
                    { waypointDraftCategory: category },
                    false,
                    'setWaypointDraftCategory',
                ),

            toggleWaypointCategoryFilter: (category) =>
                set(
                    (s) => ({
                        waypointCategoryFilters: {
                            ...s.waypointCategoryFilters,
                            [category]: !s.waypointCategoryFilters[category],
                        },
                    }),
                    false,
                    `toggleWaypointCategoryFilter/${category}`,
                ),

            setWaypointCategoryFilter: (category, on) =>
                set(
                    (s) => ({
                        waypointCategoryFilters: {
                            ...s.waypointCategoryFilters,
                            [category]: on,
                        },
                    }),
                    false,
                    `setWaypointCategoryFilter/${category}`,
                ),

            setCampusBuildings: (list) =>
                set({ campusBuildings: list }, false, 'setCampusBuildings'),

            /* ── Camera actions ────────────────────────────────── */

            setCameraMode: (mode) =>
                set({ cameraMode: mode }, false, `setCameraMode/${mode}`),

            toggleCameraMode: () =>
                set(
                    (s) => ({
                        cameraMode: s.cameraMode === 'orbit' ? 'map' : 'orbit',
                    }),
                    false,
                    'toggleCameraMode',
                ),

            requestCameraReset: () =>
                set(
                    (s) => ({
                        cameraResetNonce: s.cameraResetNonce + 1,
                        selectedEntity: null,
                        selectedWaypointId: null,
                    }),
                    false,
                    'requestCameraReset',
                ),
        }),
        {
            name: 'TwinCampus-Store', // Name shown in Redux DevTools
        }
    )
)

export const selectedEntitySelector = (state: AppState): string | null =>
    state.selectedEntity
