/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import {
  BuildingsGroup,
  CAMPUS_GLB_PATH,
  collectBuildingMeshNodes,
  resolveMeshBuildingIdentity,
  stripImportedMaterials,
} from './BuildingsGroup'
import { useAssetLoader } from '../../hooks/useAssetLoader'

const mockScene = { children: [], uuid: 'scene', userData: {}, traverse: vi.fn() }

vi.mock('@react-three/fiber', () => ({
  ...vi.importActual('@react-three/fiber'),
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: (fn: () => void) => {
    fn()
  },
  useThree: (selector?: (s: { clock: { getElapsedTime: () => number }; invalidate: () => void }) => unknown) =>
    selector
      ? selector({ clock: { getElapsedTime: () => 0 }, invalidate: vi.fn() })
      : { clock: { getElapsedTime: () => 0 }, invalidate: vi.fn() },
}))

vi.mock('../../hooks/useAssetLoader', () => ({
  useAssetLoader: Object.assign(vi.fn(), { preload: vi.fn() }),
}))

vi.mock('../../utils/gps', () => ({
  gpsToWorldPosition: () => ({ x: 0, y: 0, z: 0 }),
}))

describe('BuildingsGroup', () => {
  beforeEach(() => {
    vi.mocked(useAssetLoader).mockReturnValue({ scene: mockScene } as never)
  })

  it('renders without crashing', () => {
    expect(() => render(<BuildingsGroup />)).not.toThrow()
  })

  it('loads the campus greybox from the expected path', () => {
    render(<BuildingsGroup />)
    expect(useAssetLoader).toHaveBeenCalledWith(CAMPUS_GLB_PATH)
  })

  it('collects all building mesh nodes from nested groups', () => {
    const scene = new THREE.Scene()
    const buildingA = new THREE.Group()
    buildingA.name = 'Building A'
    const sectionA = new THREE.Group()
    const meshA1 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    const meshA2 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())

    sectionA.add(meshA1)
    sectionA.add(meshA2)
    buildingA.add(sectionA)

    const buildingB = new THREE.Group()
    buildingB.name = 'Building B'
    const meshB1 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    buildingB.add(meshB1)

    scene.add(buildingA)
    scene.add(buildingB)

    const nodes = collectBuildingMeshNodes(scene)

    expect(nodes).toHaveLength(3)
    expect(nodes.map((n) => n.buildingName)).toEqual(['Building A', 'Building A', 'Building B'])
  })

  it('canonicalizes Blender duplicate mesh names like building_e_2', () => {
    const scene = new THREE.Scene()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    mesh.name = 'building_e_2'
    scene.add(mesh)

    const nodes = collectBuildingMeshNodes(scene)

    expect(nodes).toHaveLength(1)
    expect(nodes[0].meshName).toBe('building_e')
    expect(nodes[0].buildingName).toBe('building_e')
  })

  it('uses mesh `building_*` slug when a single GLTF root group shares one UUID (e.g. "Scene")', () => {
    const scene = new THREE.Scene()
    const gltfRoot = new THREE.Group()
    gltfRoot.name = 'Scene'
    const meshA = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    meshA.name = 'building_a'
    const meshB = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    meshB.name = 'building_b'
    gltfRoot.add(meshA)
    gltfRoot.add(meshB)
    scene.add(gltfRoot)

    const nodes = collectBuildingMeshNodes(scene)

    expect(nodes).toHaveLength(2)
    expect(nodes.map((n) => n.buildingId)).toEqual(['building_a', 'building_b'])
    expect(nodes[0].buildingId).not.toBe(nodes[1].buildingId)
  })

  it('resolveMeshBuildingIdentity prefers mesh slug over shared parent UUID', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    mesh.name = 'building_c'
    const parent = { id: '02b69f23-0a5b-45e5-8825-55c42b27a061', name: 'Scene' }
    const out = resolveMeshBuildingIdentity(mesh, parent)
    expect(out.id).toBe('building_c')
  })

  it('strips imported blender materials from traversed meshes', () => {
    const scene = new THREE.Scene()
    const meshSingle = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    const firstMulti = new THREE.MeshBasicMaterial()
    const secondMulti = new THREE.MeshPhysicalMaterial()
    const meshMulti = new THREE.Mesh(new THREE.BoxGeometry(), [firstMulti, secondMulti])
    const disposeSingleSpy = vi.spyOn(meshSingle.material as THREE.Material, 'dispose')
    const disposeMultiFirstSpy = vi.spyOn(firstMulti, 'dispose')
    const disposeMultiSecondSpy = vi.spyOn(secondMulti, 'dispose')

    scene.add(meshSingle)
    scene.add(meshMulti)

    const strippedCount = stripImportedMaterials(scene)

    expect(strippedCount).toBe(3)
    expect(disposeSingleSpy).toHaveBeenCalledTimes(1)
    expect(disposeMultiFirstSpy).toHaveBeenCalledTimes(1)
    expect(disposeMultiSecondSpy).toHaveBeenCalledTimes(1)
    expect(Array.isArray(meshSingle.material)).toBe(false)
    expect(Array.isArray(meshMulti.material)).toBe(false)
  })
})
