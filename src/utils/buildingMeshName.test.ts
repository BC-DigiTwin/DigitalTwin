import { describe, it, expect } from 'vitest'
import { buildingDisplayName, canonicalBuildingMeshName } from './buildingMeshName'

describe('canonicalBuildingMeshName', () => {
  it('strips Blender-style duplicate suffix after underscore', () => {
    expect(canonicalBuildingMeshName('building_e_2')).toBe('building_e')
    expect(canonicalBuildingMeshName('building_c_2')).toBe('building_c')
    expect(canonicalBuildingMeshName('building_d_10')).toBe('building_d')
  })

  it('strips duplicate suffix after a dot', () => {
    expect(canonicalBuildingMeshName('building_e.001')).toBe('building_e')
    expect(canonicalBuildingMeshName('building_a.002')).toBe('building_a')
  })

  it('leaves non-matching names alone', () => {
    expect(canonicalBuildingMeshName('building_science')).toBe('building_science')
    expect(canonicalBuildingMeshName('floor_2')).toBe('floor_2')
    expect(canonicalBuildingMeshName('Building A')).toBe('Building A')
    expect(canonicalBuildingMeshName('building_e')).toBe('building_e')
  })
})

describe('buildingDisplayName', () => {
  it('uses fallback for blank input', () => {
    expect(buildingDisplayName('', 'x')).toBe('x')
    expect(buildingDisplayName('   ', 'x')).toBe('x')
    expect(buildingDisplayName(undefined, 'x')).toBe('x')
    expect(buildingDisplayName(null, 'x')).toBe('x')
  })

  it('applies canonical rules', () => {
    expect(buildingDisplayName('building_e_2', 'fallback')).toBe('building_e')
  })
})
