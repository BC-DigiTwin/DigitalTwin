import { describe, expect, it } from 'vitest'
import { campusBuildingLabel, campusBuildingMenuGlyph } from './campusBuildingLabel'

describe('campusBuildingLabel', () => {
  it('formats single-letter buildings as "<Letter> Building"', () => {
    expect(campusBuildingLabel('building_a')).toBe('A Building')
    expect(campusBuildingLabel('building_b')).toBe('B Building')
    expect(campusBuildingLabel('building_e')).toBe('E Building')
  })

  it('labels the garage as Parking Garage', () => {
    expect(campusBuildingLabel('building_garage')).toBe('Parking Garage')
  })

  it('falls back to a title-cased slug for other ids', () => {
    expect(campusBuildingLabel('building_science')).toBe('Science')
  })
})

describe('campusBuildingMenuGlyph', () => {
  it('returns a single letter for letter buildings', () => {
    expect(campusBuildingMenuGlyph('building_a')).toBe('A')
    expect(campusBuildingMenuGlyph('building_c')).toBe('C')
  })

  it('returns the first slug character for other buildings', () => {
    expect(campusBuildingMenuGlyph('building_science')).toBe('S')
  })
})
