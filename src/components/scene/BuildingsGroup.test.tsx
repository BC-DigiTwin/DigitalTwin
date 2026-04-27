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
  useThree: (selector?: (s: { clock: { getElapsedTime: () => number } }) => unknown) =>
    selector ? selector({ clock: { getElapsedTime: () => 0 } }) : { clock: { getElapsedTime: () => 0 } },
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
