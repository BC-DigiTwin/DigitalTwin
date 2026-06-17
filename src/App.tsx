import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useControls, button, folder } from 'leva'
import { Perf } from 'r3f-perf'
import { CameraRig, DEFAULT_CAMERA_SETTINGS } from './components/CameraRig'
import {
  CameraControlProvider,
  useCameraControl,
} from './contexts/CameraControlContext'
import { BuildingsGroup } from './components/scene/BuildingsGroup'
import { AuxBuildingsGroup } from './components/scene/AuxBuildingsGroup'
import { RoadsGroup } from './components/scene/RoadsGroup'
import { TerrainGroup } from './components/scene/TerrainGroup'
import { StressTestGroup } from './components/scene/StressTestGroup'
import { InstancedRimExample } from './components/scene/InstancedRimExample'
import { WaypointsGroup } from './components/scene/WaypointsGroup'
import { WaypointsPanel } from './components/WaypointsPanel'
import { LoadingScreen } from './components/LoadingScreen'
import { selectedEntitySelector, useStore, type LayerName } from './store/useStore'
import './App.css'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { RENDER_LAYERS } from './constants/renderLayers'
import { DebugWrapper } from './components/DebugWrapper'
import { AssetErrorBoundary } from './components/AssetErrorBoundary'
import { PlaceholderBox } from './components/PlaceholderBox'
import { useHydrateLocations } from './hooks/useHydrateLocations'
import { SceneBackground } from './components/scene/SceneBackground'
import { SidePanel, type BuildingApiData } from './components/SidePanel'
import { BuildingHoverLabel } from './components/scene/BuildingHoverLabel'
import { BuildingSelector } from './components/BuildingSelector'
import { cameraHeading } from './utils/cameraHeading'
import { mockBuildings } from '../lib/mockDatabase'
import {
  SELECTION_SOLID_BODY_COLOR_DEFAULT,
} from './constants/sceneMaterials'
function PerfOverlay() {
  const showPerfOverlay = useStore((s) => s.showPerfOverlay)
  if (!showPerfOverlay) return null
  return <Perf position="top-left" minimal={false} />
}

/**
 * Leva panel that exposes scene-layer visibility toggles backed by Zustand.
 *
 * Leva owns the checkbox state; changes are pushed one-way into Zustand
 * via `useEffect` so we avoid an infinite onChange → re-render loop.
 */
function LayerToggles() {
  const setLayerVisible = useStore((s) => s.setLayerVisible)
  const setStressTestMeshCount = useStore((s) => s.setStressTestMeshCount)
  const initialRef = useRef(useStore.getState().layers)

  const {
    Buildings: buildings,
    Terrain: terrain,
    'Stress Test': stressTest,
    'Stress test mesh count': stressMeshCount,
    'Instanced Rim': instancedRim,
    Waypoints: waypoints,
  } = useControls(
    'Layer Visibility',
    {
      Buildings: { value: initialRef.current.buildings },
      Terrain: { value: initialRef.current.terrain },
      'Stress Test': { value: initialRef.current.stressTest },
      'Stress test mesh count': {
        value: useStore.getState().stressTestMeshCount,
        min: 500,
        max: 1200,
        step: 100,
        /** Show only when Stress Test is on — uses Leva state so it appears immediately (paths are folder-scoped). */
        render: (get) => !!get('Layer Visibility.Stress Test'),
      },
      'Instanced Rim': { value: initialRef.current.instancedRim ?? false },
      Waypoints: { value: initialRef.current.waypoints ?? true },
    },
    { collapsed: true },
  )

  useEffect(() => {
    const entries: [LayerName, boolean][] = [
      ['buildings', buildings],
      ['terrain', terrain],
      ['stressTest', stressTest],
      ['instancedRim', instancedRim],
      ['waypoints', waypoints],
    ]
    for (const [layer, visible] of entries) {
      setLayerVisible(layer, visible)
    }
  }, [buildings, terrain, stressTest, instancedRim, waypoints, setLayerVisible])

  useEffect(() => {
    if (stressTest && typeof stressMeshCount === 'number') {
      setStressTestMeshCount(stressMeshCount)
    }
  }, [stressTest, stressMeshCount, setStressTestMeshCount])

  return null
}

/**
 * Leva panel for campus greybox “blueprint” tint: base color, opacity, emissive glow.
 * Values are stored in Zustand so scene code can subscribe without prop drilling from here.
 */
function BlueprintBuildingControls() {
  const setBlueprintBuildingMaterial = useStore((s) => s.setBlueprintBuildingMaterial)
  const initialRef = useRef(useStore.getState().blueprintBuildingMaterial)

  const d = initialRef.current
  const {
    baseColor,
    opacity,
    emissiveIntensity,
    doubleSide,
    edgeColor,
    edgeOpacity,
    edgeLineWidth,
    showEdges,
    edgeThreshold,
    showBuildingGrid,
    buildingGridColor,
    buildingGridOpacity,
    buildingGridCellSize,
  } = useControls(
    'Buildings',
    {
      baseColor: { value: d.color, label: 'Color' },
      opacity: { value: d.opacity, min: 0, max: 1, step: 0.02, label: 'Opacity' },
      emissiveIntensity: {
        value: d.emissiveIntensity,
        min: 0,
        max: 2.5,
        step: 0.05,
        label: 'Emissive (glow)',
      },
      doubleSide: { value: d.doubleSide, label: 'Double side' },
      edgeColor: { value: d.edgeColor, label: 'Crease edge color' },
      edgeOpacity: {
        value: d.edgeOpacity,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Crease edge opacity',
      },
      showEdges: { value: d.showEdges, label: 'Show crease edges' },
      edgeLineWidth: {
        value: d.edgeLineWidth,
        min: 0.5,
        max: 6,
        step: 0.25,
        label: 'Crease edge thickness (px)',
      },
      edgeThreshold: {
        value: d.edgeThreshold,
        min: 15,
        max: 20,
        step: 1,
        label: 'Crease edge threshold angle (°)',
      },
      showBuildingGrid: {
        value: d.showBuildingGrid,
        label: 'Show surface grid (square)',
      },
      buildingGridColor: {
        value: d.buildingGridColor,
        label: 'Surface grid color',
      },
      buildingGridOpacity: {
        value: d.buildingGridOpacity,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Surface grid opacity',
      },
      buildingGridCellSize: {
        value: d.buildingGridCellSize,
        min: 0.5,
        max: 40,
        step: 0.5,
        label: 'Surface grid cell size',
      },
    },
    { collapsed: true },
  )

  useEffect(() => {
    setBlueprintBuildingMaterial({
      color: baseColor,
      opacity,
      emissiveIntensity,
      doubleSide,
      edgeColor,
      edgeOpacity,
      edgeLineWidth,
      showEdges,
      edgeThreshold,
      showBuildingGrid,
      buildingGridColor,
      buildingGridOpacity,
      buildingGridCellSize,
    })
  }, [
    baseColor,
    opacity,
    emissiveIntensity,
    doubleSide,
    edgeColor,
    edgeOpacity,
    edgeLineWidth,
    showEdges,
    edgeThreshold,
    showBuildingGrid,
    buildingGridColor,
    buildingGridOpacity,
    buildingGridCellSize,
    setBlueprintBuildingMaterial,
  ])

  return null
}

/** Leva → Zustand: background auxiliary building fill and crease styling. */
function AuxBuildingControls() {
  const setAuxBuildingMaterial = useStore((s) => s.setAuxBuildingMaterial)
  const initialRef = useRef(useStore.getState().auxBuildingMaterial)
  const d = initialRef.current

  const {
    opacity,
    fillSaturationMult,
    fillLightnessMult,
    minLightness,
    showEdges,
    deriveEdgeColorFromHero,
    edgeColor,
    edgeSaturationMult,
    edgeLightnessMult,
    edgeOpacity,
    edgeLineWidth,
    edgeThreshold,
  } = useControls(
    'Aux Buildings',
    {
      opacity: {
        value: d.opacity,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Face opacity',
      },
      fillSaturationMult: {
        value: d.fillSaturationMult,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Fill saturation (× hero)',
      },
      fillLightnessMult: {
        value: d.fillLightnessMult,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Fill lightness (× hero)',
      },
      minLightness: {
        value: d.minLightness,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: 'Min lightness floor',
      },
      showEdges: { value: d.showEdges, label: 'Show crease edges' },
      deriveEdgeColorFromHero: {
        value: d.deriveEdgeColorFromHero,
        label: 'Derive crease color from hero',
      },
      edgeColor: {
        value: d.edgeColor,
        label: 'Crease color (manual)',
        render: (get) => !get('Aux Buildings.deriveEdgeColorFromHero'),
      },
      edgeSaturationMult: {
        value: d.edgeSaturationMult,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Crease saturation (× hero)',
        render: (get) => !!get('Aux Buildings.deriveEdgeColorFromHero'),
      },
      edgeLightnessMult: {
        value: d.edgeLightnessMult,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Crease lightness (× hero)',
        render: (get) => !!get('Aux Buildings.deriveEdgeColorFromHero'),
      },
      edgeOpacity: {
        value: d.edgeOpacity,
        min: 0,
        max: 1,
        step: 0.02,
        label: 'Crease opacity',
      },
      edgeLineWidth: {
        value: d.edgeLineWidth,
        min: 0.5,
        max: 6,
        step: 0.25,
        label: 'Crease thickness (px)',
      },
      edgeThreshold: {
        value: d.edgeThreshold,
        min: 15,
        max: 20,
        step: 1,
        label: 'Crease threshold angle (°)',
      },
    },
    { collapsed: true },
  )

  useEffect(() => {
    setAuxBuildingMaterial({
      opacity,
      fillSaturationMult,
      fillLightnessMult,
      minLightness,
      showEdges,
      deriveEdgeColorFromHero,
      edgeColor,
      edgeSaturationMult,
      edgeLightnessMult,
      edgeOpacity,
      edgeLineWidth,
      edgeThreshold,
    })
  }, [
    opacity,
    fillSaturationMult,
    fillLightnessMult,
    minLightness,
    showEdges,
    deriveEdgeColorFromHero,
    edgeColor,
    edgeSaturationMult,
    edgeLightnessMult,
    edgeOpacity,
    edgeLineWidth,
    edgeThreshold,
    setAuxBuildingMaterial,
  ])

  return null
}

/** Leva → Zustand: ground plane color and PBR sliders. */
function TerrainGroundControls() {
  const setTerrainGroundMaterial = useStore((s) => s.setTerrainGroundMaterial)
  const setTerrainShowGroundPlane = useStore((s) => s.setTerrainShowGroundPlane)
  const setTerrainShowGrid = useStore((s) => s.setTerrainShowGrid)
  const setTerrainGridLineColor = useStore((s) => s.setTerrainGridLineColor)
  const initialRef = useRef(useStore.getState().terrainGroundMaterial)
  const initialGroundPlaneRef = useRef(useStore.getState().terrainShowGroundPlane)
  const initialGridRef = useRef(useStore.getState().terrainShowGrid)
  const initialGridColorRef = useRef(useStore.getState().terrainGridLineColor)
  const d = initialRef.current

  const {
    groundColor,
    roughness,
    metalness,
    showGroundPlane,
    showGrid,
    gridLineColor,
  } = useControls(
    'Ground',
    {
      showGroundPlane: {
        value: initialGroundPlaneRef.current,
        label: 'Show ground plane',
      },
      groundColor: { value: d.color, label: 'Ground color' },
      roughness: { value: d.roughness, min: 0, max: 1, step: 0.02 },
      metalness: { value: d.metalness, min: 0, max: 1, step: 0.02 },
      showGrid: {
        value: initialGridRef.current,
        label: 'Show grid',
      },
      gridLineColor: {
        value: initialGridColorRef.current,
        label: 'Grid line color',
      },
    },
    { collapsed: true },
  )

  useEffect(() => {
    setTerrainGroundMaterial({
      color: groundColor,
      roughness,
      metalness,
    })
  }, [groundColor, roughness, metalness, setTerrainGroundMaterial])

  useEffect(() => {
    setTerrainShowGroundPlane(showGroundPlane)
  }, [showGroundPlane, setTerrainShowGroundPlane])

  useEffect(() => {
    setTerrainShowGrid(showGrid)
  }, [showGrid, setTerrainShowGrid])

  useEffect(() => {
    setTerrainGridLineColor(gridLineColor)
  }, [gridLineColor, setTerrainGridLineColor])

  return null
}

/** Leva → Zustand: campus road network color, opacity, and draw settings. */
function RoadsControls() {
  const setRoadsMaterial = useStore((s) => s.setRoadsMaterial)
  const setRoadsVisible = useStore((s) => s.setRoadsVisible)
  const initialRef = useRef(useStore.getState().roadsMaterial)
  const initialVisibleRef = useRef(useStore.getState().roadsVisible)
  const d = initialRef.current

  const {
    showRoads,
    roadColor,
    opacity,
    doubleSide,
    depthWrite,
    renderOrder,
  } = useControls(
    'Roads',
    {
      showRoads: { value: initialVisibleRef.current, label: 'Show roads' },
      roadColor: { value: d.color, label: 'Color' },
      opacity: { value: d.opacity, min: 0, max: 1, step: 0.02, label: 'Opacity' },
      doubleSide: { value: d.doubleSide, label: 'Double side' },
      depthWrite: { value: d.depthWrite, label: 'Depth write' },
      renderOrder: {
        value: d.renderOrder,
        min: -50,
        max: 10,
        step: 1,
        label: 'Render order',
      },
    },
    { collapsed: true },
  )

  useEffect(() => {
    setRoadsVisible(showRoads)
  }, [showRoads, setRoadsVisible])

  useEffect(() => {
    setRoadsMaterial({
      color: roadColor,
      opacity,
      doubleSide,
      depthWrite,
      renderOrder,
    })
  }, [
    roadColor,
    opacity,
    doubleSide,
    depthWrite,
    renderOrder,
    setRoadsMaterial,
  ])

  return null
}

/**
 * Leva → Zustand: showcase-selection toggles.
 *
 * Switches that customize what happens when a building is clicked. Most
 * default to `true` (polished showcase); turning one off reverts that aspect.
 *
 * Registered as a **nested subfolder inside the existing "Buildings" panel**
 * so the interaction toggles live next to the building visual settings (Leva
 * automatically merges multiple `useControls` calls that share a parent
 * folder name).
 */
function SelectionBehaviorControls() {
  const setSelectionLiftEnabled = useStore((s) => s.setSelectionLiftEnabled)
  const setSelectionMuteOthersEnabled = useStore(
    (s) => s.setSelectionMuteOthersEnabled,
  )
  const setSelectionSolidSelectedEnabled = useStore(
    (s) => s.setSelectionSolidSelectedEnabled,
  )
  const setSelectionSolidBodyColor = useStore((s) => s.setSelectionSolidBodyColor)
  const setSelectionSolidGlowEnabled = useStore(
    (s) => s.setSelectionSolidGlowEnabled,
  )
  const initialLiftRef = useRef(useStore.getState().selectionLiftEnabled)
  const initialMuteRef = useRef(useStore.getState().selectionMuteOthersEnabled)
  const initialSolidRef = useRef(
    useStore.getState().selectionSolidSelectedEnabled,
  )
  const initialSolidColorRef = useRef(
    useStore.getState().selectionSolidBodyColor,
  )
  const initialSolidGlowRef = useRef(
    useStore.getState().selectionSolidGlowEnabled,
  )

  const {
    liftAndRotate,
    muteOthers,
    solidSelectedBuilding,
    solidSelectedColor,
    solidSelectedGlow,
  } = useControls(
    'Buildings',
    {
      'Selection behavior': folder(
        {
          liftAndRotate: {
            value: initialLiftRef.current,
            label: 'Lift & rotate selected',
          },
          muteOthers: {
            value: initialMuteRef.current,
            label: 'Mute other buildings',
          },
          solidSelectedBuilding: {
            value: initialSolidRef.current,
            label: 'Solid selected building',
          },
          solidSelectedColor: {
            value: initialSolidColorRef.current || SELECTION_SOLID_BODY_COLOR_DEFAULT,
            label: 'Solid selected color',
          },
          solidSelectedGlow: {
            value: initialSolidGlowRef.current,
            label: 'Solid selected glow',
          },
        },
        { collapsed: true },
      ),
    },
  )

  useEffect(() => {
    setSelectionLiftEnabled(liftAndRotate)
  }, [liftAndRotate, setSelectionLiftEnabled])

  useEffect(() => {
    setSelectionMuteOthersEnabled(muteOthers)
  }, [muteOthers, setSelectionMuteOthersEnabled])

  useEffect(() => {
    setSelectionSolidSelectedEnabled(solidSelectedBuilding)
  }, [solidSelectedBuilding, setSelectionSolidSelectedEnabled])

  useEffect(() => {
    const hex =
      typeof solidSelectedColor === 'string'
        ? solidSelectedColor
        : SELECTION_SOLID_BODY_COLOR_DEFAULT
    setSelectionSolidBodyColor(hex)
  }, [solidSelectedColor, setSelectionSolidBodyColor])

  useEffect(() => {
    setSelectionSolidGlowEnabled(solidSelectedGlow)
  }, [solidSelectedGlow, setSelectionSolidGlowEnabled])

  return null
}

/** Leva → Zustand: viewport / clear color (`scene.background`). */
function SceneViewportControls() {
  const setSceneBackgroundColor = useStore((s) => s.setSceneBackgroundColor)
  const initialRef = useRef(useStore.getState().sceneBackgroundColor)

  const { backgroundColor } = useControls(
    'Viewport',
    {
      backgroundColor: {
        value: initialRef.current,
        label: 'Background color',
      },
    },
    { collapsed: true },
  )

  useEffect(() => {
    setSceneBackgroundColor(backgroundColor)
  }, [backgroundColor, setSceneBackgroundColor])

  return null
}

/**
 * Single Leva `useControls` call for everything camera-related:
 * mode toggle + tuneable settings (FOV, Zoom/ViewSize, Height, etc.).
 */
function CameraRigWithControls() {
  const { mode, toggleMode } = useCameraControl()
  const setCameraTransitionSpeed = useStore((s) => s.setCameraTransitionSpeed)

  const {
    _mode,
    'Map Height': mapHeight,
    'Map View Size': mapViewSize,
    'Orbit FOV': orbitFov,
    'Transition Speed': transitionSpeed,
    Damping: damping,
  } = useControls(
    'Camera',
    {
      _mode: { value: mode, editable: false, label: 'Current Mode' },
      'Toggle Mode': button(toggleMode),
      'Map Height': { value: DEFAULT_CAMERA_SETTINGS.mapHeight, min: 20, max: 200, step: 1 },
      'Map View Size': { value: DEFAULT_CAMERA_SETTINGS.mapViewSize, min: 10, max: 150, step: 1 },
      'Orbit FOV': { value: DEFAULT_CAMERA_SETTINGS.orbitFov, min: 10, max: 100, step: 1 },
      'Transition Speed': {
        value: DEFAULT_CAMERA_SETTINGS.transitionSpeed,
        min: 0.4,
        max: 4.0,
        step: 0.05,
        label: 'Transition (s)',
      },
      Damping: { value: DEFAULT_CAMERA_SETTINGS.damping, min: 0.01, max: 0.5, step: 0.01 },
    },
    { collapsed: true },
    [mode],
  )

  // Silence unused-var for the read-only mode display
  void _mode

  useEffect(() => {
    setCameraTransitionSpeed(transitionSpeed)
  }, [transitionSpeed, setCameraTransitionSpeed])

  return (
    <CameraRig
      mode={mode}
      settings={{ mapHeight, mapViewSize, orbitFov, transitionSpeed, damping }}
    />
  )
}

function BuildingDetailsPanel() {
  const selectedEntity = useStore(selectedEntitySelector)
  const setSelectedEntity = useStore((s) => s.setSelectedEntity)
  const [buildingData, setBuildingData] = useState<BuildingApiData | null>(null)

  useEffect(() => {
    if (!selectedEntity) {
      setBuildingData(null)
      return
    }

    /**
     * Data source order:
     *   1. Try the Next.js API → real RDS row.
     *   2. If the API returns 404 (or anything non-2xx / network error),
     *      look up `selectedEntity` in `mockBuildings` as an offline fallback.
     *   3. If neither has it, the panel renders nothing.
     */
    let cancelled = false

    const applyMockFallback = (reason: string) => {
      const fromMock = mockBuildings.find((b) => b.id === selectedEntity) ?? null
      if (fromMock) {
        console.log(
          `[BuildingDetailsPanel] ${reason} — falling back to mock row for`,
          selectedEntity,
        )
      } else {
        console.warn(
          `[BuildingDetailsPanel] ${reason} — no mock row either; panel stays empty for`,
          selectedEntity,
        )
      }
      if (!cancelled) setBuildingData(fromMock)
    }

    void fetch(`/api/buildings/${encodeURIComponent(selectedEntity)}`)
      .then(async (res) => {
        if (res.status === 404) {
          applyMockFallback('API returned 404')
          return
        }
        if (!res.ok) {
          applyMockFallback(`API returned HTTP ${res.status}`)
          return
        }
        const data = (await res.json()) as BuildingApiData
        if (!cancelled) {
          console.log('[BuildingDetailsPanel] API row used for', selectedEntity)
          setBuildingData(data)
        }
      })
      .catch((err: unknown) => {
        applyMockFallback(`fetch failed (${(err as Error).message})`)
      })

    return () => {
      cancelled = true
    }
  }, [selectedEntity])

  return (
    <SidePanel
      buildingData={buildingData}
      onClose={() => {
        setSelectedEntity(null)
        setBuildingData(null)
      }}
    />
  )
}

/**
 * Bottom-left floating toolbar: home, view mode, waypoints.
 *
 *   • **Home** resets the current view — orbit → default corner pose, map →
 *     campus overview — and clears selection.
 *   • **Orbit / Map** segmented control switches camera angle only — `CameraRig`
 *     animates the transition (GSAP) without recentering.
 *   • **Waypoints** toggles the waypoint manager panel.
 *
 * Help (`ControlsHelp`) and compass (`CompassIndicator`) are separate overlays.
 */
function CameraViewControls({
  waypointsPanelOpen,
  onWaypointsPanelOpenChange,
}: {
  waypointsPanelOpen: boolean
  onWaypointsPanelOpenChange: (open: boolean) => void
}) {
  const mode = useStore((s) => s.cameraMode)
  const setCameraMode = useStore((s) => s.setCameraMode)
  const requestCameraReset = useStore((s) => s.requestCameraReset)
  const waypointsCount = useStore((s) => s.waypoints.length)
  const hasBuildingSelected = useStore((s) => s.selectedEntity !== null)

  const isOrbit = mode === 'orbit'

  const selectMode = (next: 'orbit' | 'map') => {
    // No-op when already active so we never re-trigger the transition animation.
    if (useStore.getState().cameraMode !== next) setCameraMode(next)
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 max-md:flex-col max-md:items-stretch max-md:gap-1.5${
        hasBuildingSelected ? ' max-md:bottom-[calc(60%+1rem)]' : ''
      }`}
    >
      {/* Home — orbit: default corner pose; map: campus overview */}
      <button
        type="button"
        onClick={requestCameraReset}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-neutral-950/65 text-white shadow-lg backdrop-blur-2xl transition hover:bg-neutral-900/85"
        title={isOrbit ? 'Reset to default view' : 'Reset to campus overview'}
        aria-label={
          isOrbit
            ? 'Reset camera to default orbit view'
            : 'Reset camera to campus overview'
        }
      >
        <HomeIcon className="h-5 w-5 shrink-0" />
      </button>

      {/* Segmented Orbit / Top-down control — hidden on mobile while a building is selected */}
      <div
        role="radiogroup"
        aria-label="Camera view mode"
        className={`relative flex w-full items-center rounded-full border border-white/15 bg-neutral-950/65 p-1 shadow-lg backdrop-blur-2xl md:w-auto${
          hasBuildingSelected ? ' max-md:hidden' : ''
        }`}
      >
        {/* Sliding thumb — animates between the two segments. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white/15 shadow-sm ring-1 ring-white/20 transition-transform duration-200 ease-out motion-reduce:transition-none ${
            isOrbit ? 'translate-x-0' : 'translate-x-full'
          }`}
        />
        <button
          type="button"
          role="radio"
          aria-checked={isOrbit}
          onClick={() => selectMode('orbit')}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            isOrbit ? 'text-white' : 'text-white/55 hover:text-white/80'
          }`}
          title="Orbit (3D perspective) view"
        >
          <OrbitIcon className="h-4 w-4" />
          Orbit
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!isOrbit}
          onClick={() => selectMode('map')}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            !isOrbit ? 'text-white' : 'text-white/55 hover:text-white/80'
          }`}
          title="Map (top-down) view"
        >
          <TopDownIcon className="h-4 w-4" />
          Map
        </button>
      </div>

      <button
        type="button"
        onClick={() => onWaypointsPanelOpenChange(!waypointsPanelOpen)}
        className={`flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-sm font-medium shadow-lg backdrop-blur-2xl transition hover:bg-neutral-900/85 ${
          waypointsPanelOpen
            ? 'bg-white/15 text-white ring-1 ring-white/25'
            : 'bg-neutral-950/65 text-white'
        }${hasBuildingSelected ? ' max-md:hidden' : ''}`}
        title="Waypoints"
        aria-label="Toggle waypoints panel"
        aria-expanded={waypointsPanelOpen}
      >
        <PinIcon className="h-4 w-4" />
        Waypoints
        <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-xs tabular-nums">
          {waypointsCount}
        </span>
      </button>

      <BuildingSelector />
    </div>
  )
}

/**
 * Small north indicator. The needle points to world-north on screen by reading
 * the shared `cameraHeading` singleton in its own rAF loop and mutating the
 * transform directly — no React re-renders per frame.
 */
function CompassIndicator() {
  const needleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = needleRef.current
      if (el) el.style.transform = `rotate(${cameraHeading.current}rad)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
      title="North"
      aria-label="Compass — points north"
    >
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-neutral-950/65 shadow-lg backdrop-blur-2xl">
        <div ref={needleRef} className="h-full w-full will-change-transform">
        <svg viewBox="0 0 36 36" className="h-full w-full" aria-hidden>
          {/* North half (red), pointing up */}
          <path d="M18 7 L21.2 18 L18 16 L14.8 18 Z" fill="#f4647d" />
          {/* South half (muted) */}
          <path d="M18 29 L14.8 18 L18 20 L21.2 18 Z" fill="#ffffff66" />
          <text
            x="18"
            y="6"
            textAnchor="middle"
            fontSize="6"
            fontWeight="700"
            fill="#ffffffcc"
          >
            N
          </text>
        </svg>
        </div>
      </div>
    </div>
  )
}

const CONTROLS_HELP_DISMISSED_KEY = 'dt-controls-help-dismissed'

/**
 * Dismissible controls cheat-sheet. Opens automatically on first run (until
 * dismissed, persisted in localStorage) and can be reopened with the `?`
 * button in the bottom-right corner. The card opens above that button.
 */
function ControlsHelp() {
  const hasBuildingSelected = useStore((s) => s.selectedEntity !== null)
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CONTROLS_HELP_DISMISSED_KEY) !== '1'
    } catch {
      return true
    }
  })

  const dismiss = () => {
    setOpen(false)
    try {
      localStorage.setItem(CONTROLS_HELP_DISMISSED_KEY, '1')
    } catch {
      /* ignore storage failures (private mode etc.) */
    }
  }

  const rows: [string, string][] = [
    ['Zoom', 'Scroll wheel / two-finger scroll / pinch'],
    ['Rotate (orbit)', 'Left-drag / one-finger drag'],
    ['Pan', 'Ctrl/Cmd-drag, or right-drag'],
    ['Select', 'Click a building'],
    ['View', 'O orbit · M map · H home'],
    ['Deselect', 'Esc'],
  ]

  return (
    <>
      <div
        className={`fixed bottom-4 right-4 z-50${
          hasBuildingSelected ? ' max-md:bottom-[calc(60%+1rem)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-neutral-950/65 text-sm font-semibold text-white shadow-lg backdrop-blur-2xl transition hover:bg-neutral-900/85"
          title="Controls"
          aria-label="Show controls help"
          aria-expanded={open}
        >
          ?
        </button>
      </div>

      {open && (
        <div
          className={`fixed bottom-16 right-4 z-50 w-[min(92vw,28rem)] rounded-2xl border border-white/15 bg-neutral-950/70 p-4 text-white shadow-2xl backdrop-blur-2xl${
            hasBuildingSelected ? ' max-md:bottom-[calc(60%+3.5rem)]' : ''
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Controls</h2>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium ring-1 ring-white/15 transition hover:bg-white/20"
            >
              Got it
            </button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            {rows.map(([keys, action]) => (
              <div key={keys} className="contents">
                <dt className="font-medium text-white/90">{keys}</dt>
                <dd className="text-white/55">{action}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </>
  )
}

/**
 * Global keyboard shortcuts (HTML side, outside the Canvas):
 *   Esc — clear building + waypoint selection
 *   O / M — Orbit / Map view
 *   H — Home (orbit → default view, map → campus overview)
 * Ignored while typing in an input/textarea/select so panel fields keep working.
 */
function KeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      const s = useStore.getState()
      switch (e.key) {
        case 'Escape':
          if (s.selectedEntity) s.setSelectedEntity(null)
          if (s.selectedWaypointId) s.setSelectedWaypointId(null)
          break
        case 'o':
        case 'O':
          if (s.cameraMode !== 'orbit') s.setCameraMode('orbit')
          break
        case 'm':
        case 'M':
          if (s.cameraMode !== 'map') s.setCameraMode('map')
          break
        case 'h':
        case 'H':
          s.requestCameraReset()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}

function OrbitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="10" r="3" fill="currentColor" />
      <ellipse
        cx="10"
        cy="10"
        rx="8"
        ry="3.4"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(-28 10 10)"
      />
    </svg>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M4 16V8.5l6-4 6 4V16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M8 1.25c-2.62 0-4.75 2.12-4.75 4.75 0 3.7 4.05 8.04 4.4 8.4a.5.5 0 00.7 0c.35-.36 4.4-4.7 4.4-8.4 0-2.63-2.13-4.75-4.75-4.75zm0 6.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z" />
    </svg>
  )
}

function TopDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 6.5v7M6.5 10h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function App() {
  useHydrateLocations()
  const [waypointsPanelOpen, setWaypointsPanelOpen] = useState(false)

  // Tracks the most recent pointer-down on the canvas so `onPointerMissed`
  // (which also fires after camera drags) can tell a genuine click on empty
  // space from the end of an orbit/pan drag.
  const pointerDownRef = useRef<{ x: number; y: number; t: number } | null>(
    null,
  )

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
    }
  }

  // Click on empty space (not a building or waypoint) clears the selection.
  // The raycaster only tests the INTERACTIVE layer, so ground/roads/sky all
  // register as a miss. We ignore drags (camera move) via a small threshold.
  const handleCanvasPointerMissed = (e: MouseEvent) => {
    const down = pointerDownRef.current
    if (!down) return
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    const elapsed = performance.now() - down.t
    if (moved > 4 || elapsed > 400) return

    const s = useStore.getState()
    // While placing/editing waypoints, leave the selection alone.
    if (s.waypointPlacementMode) return
    if (s.selectedEntity) s.setSelectedEntity(null)
    if (s.selectedWaypointId) s.setSelectedWaypointId(null)
  }

  return (
    <DebugWrapper>
      <div className="canvas-container">
        {/* HTML overlay — tracks drei's internal loading progress */}
        <LoadingScreen />
        <KeyboardShortcuts />
        <BuildingDetailsPanel />
        <CameraViewControls
          waypointsPanelOpen={waypointsPanelOpen}
          onWaypointsPanelOpenChange={setWaypointsPanelOpen}
        />
        <CompassIndicator />
        <ControlsHelp />

        <Canvas
          dpr={[1, 2]}
          onPointerDown={handleCanvasPointerDown}
          onPointerMissed={handleCanvasPointerMissed}
          onCreated={({ gl, raycaster }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.outputColorSpace = SRGBColorSpace
            raycaster.layers.set(RENDER_LAYERS.INTERACTIVE)
          }}
        >
          <CameraControlProvider>
            <SceneBackground />
            <PerfOverlay />

            <BlueprintBuildingControls />
            <AuxBuildingControls />
            <CameraRigWithControls />
            <LayerToggles />
            <SelectionBehaviorControls />
            <SceneViewportControls />
            <TerrainGroundControls />
            <RoadsControls />

            {/* Non-suspending layers render immediately */}
            <TerrainGroup />
            <StressTestGroup />
            <InstancedRimExample />
            <WaypointsGroup />
            <BuildingHoverLabel />

            {/* Asset-heavy layers suspend until loaded; errors are caught
                and surfaced via the HTML overlay (LoadingScreen).
                The fallback box approximates the campus model footprint. */}
            <AssetErrorBoundary
              fallback={<PlaceholderBox size={[80, 12, 80]} />}
            >
              <Suspense fallback={null}>
                <RoadsGroup />
                <AuxBuildingsGroup />
                <BuildingsGroup />
              </Suspense>
            </AssetErrorBoundary>
          </CameraControlProvider>
        </Canvas>
        <WaypointsPanel
          open={waypointsPanelOpen}
          onOpenChange={setWaypointsPanelOpen}
        />
      </div>
    </DebugWrapper>
  )
}