import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useControls, button } from 'leva'
import { Perf } from 'r3f-perf'
import { CameraRig, DEFAULT_CAMERA_SETTINGS } from './components/CameraRig'
import {
  CameraControlProvider,
  useCameraControl,
} from './contexts/CameraControlContext'
import { BuildingsGroup } from './components/scene/BuildingsGroup'
import { TerrainGroup } from './components/scene/TerrainGroup'
import { StressTestGroup } from './components/scene/StressTestGroup'
import { InstancedRimExample } from './components/scene/InstancedRimExample'
import { LoadingScreen } from './components/LoadingScreen'
import { useStore, type LayerName } from './store/useStore'
import './App.css'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { RENDER_LAYERS } from './constants/renderLayers'
import { DebugWrapper } from './components/DebugWrapper'
import { AssetErrorBoundary } from './components/AssetErrorBoundary'
import { PlaceholderBox } from './components/PlaceholderBox'
import { useHydrateLocations } from './hooks/useHydrateLocations'
import { SceneBackground } from './components/scene/SceneBackground'
import { InfoPanel } from './components/InfoPanel'

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
    },
    { collapsed: false },
  )

  useEffect(() => {
    const entries: [LayerName, boolean][] = [
      ['buildings', buildings],
      ['terrain', terrain],
      ['stressTest', stressTest],
      ['instancedRim', instancedRim],
    ]
    for (const [layer, visible] of entries) {
      setLayerVisible(layer, visible)
    }
  }, [buildings, terrain, stressTest, instancedRim, setLayerVisible])

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

  const { groundColor, roughness, metalness, showGroundPlane, showGrid, gridLineColor } =
    useControls(
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

  const {
    _mode,
    'Map Height': mapHeight,
    'Map View Size': mapViewSize,
    'Orbit FOV': orbitFov,
    'Transition Speed': transitionSpeed,
    Damping: damping,
  } = useControls('Camera', {
    _mode: { value: mode, editable: false, label: 'Current Mode' },
    'Toggle Mode': button(toggleMode),
    'Map Height': { value: DEFAULT_CAMERA_SETTINGS.mapHeight, min: 20, max: 200, step: 1 },
    'Map View Size': { value: DEFAULT_CAMERA_SETTINGS.mapViewSize, min: 10, max: 150, step: 1 },
    'Orbit FOV': { value: DEFAULT_CAMERA_SETTINGS.orbitFov, min: 10, max: 100, step: 1 },
    'Transition Speed': { value: DEFAULT_CAMERA_SETTINGS.transitionSpeed, min: 0.1, max: 3.0, step: 0.05 },
    Damping: { value: DEFAULT_CAMERA_SETTINGS.damping, min: 0.01, max: 0.5, step: 0.01 },
  }, [mode])

  // Silence unused-var for the read-only mode display
  void _mode

  return (
    <CameraRig
      mode={mode}
      settings={{ mapHeight, mapViewSize, orbitFov, transitionSpeed, damping }}
    />
  )
}

export default function App() {
  useHydrateLocations()

  return (
    <DebugWrapper>
      <div className="canvas-container">
        {/* HTML overlay — tracks drei's internal loading progress */}
        <LoadingScreen />

        <Canvas
          dpr={[1, 2]}
          onCreated={({ gl, raycaster }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.outputColorSpace = SRGBColorSpace
            raycaster.layers.set(RENDER_LAYERS.INTERACTIVE)
          }}
        >
          <CameraControlProvider>
            <SceneBackground />
            <Perf position="top-left" minimal={false} />

            <CameraRigWithControls />
            <LayerToggles />
            <SceneViewportControls />
            <BlueprintBuildingControls />
            <TerrainGroundControls />

            {/* Non-suspending layers render immediately */}
            <TerrainGroup />
            <StressTestGroup />
            <InstancedRimExample />

            {/* Asset-heavy layers suspend until loaded; errors are caught
                and surfaced via the HTML overlay (LoadingScreen).
                The fallback box approximates the campus model footprint. */}
            <AssetErrorBoundary
              fallback={<PlaceholderBox size={[80, 12, 80]} />}
            >
              <Suspense fallback={null}>
                <BuildingsGroup />
              </Suspense>
            </AssetErrorBoundary>
          </CameraControlProvider>
        </Canvas>
        <InfoPanel />
      </div>
    </DebugWrapper>
  )
}