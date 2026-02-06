import { describe, it, expect } from 'vitest'
import { gpsToVector3 } from './gps'

/** ~111.2 km per degree latitude (WGS84 sphere). */
const METERS_PER_DEGREE_LAT = (Math.PI / 180) * 6_371_000

describe('gpsToVector3', () => {
  it('maps reference point (refLat, refLon) to origin (0, 0, 0)', () => {
    const refLat = 40.7128
    const refLon = -74.006
    const v = gpsToVector3(refLat, refLon, refLat, refLon)
    expect(v.x).toBe(0)
    expect(v.y).toBe(0)
    expect(v.z).toBeCloseTo(0, 10) // Z = -north can be -0
  })

  it('maps 1° north of reference to positive North (negative Z)', () => {
    const refLat = 0
    const refLon = 0
    const v = gpsToVector3(refLat + 1, refLon, refLat, refLon)
    expect(v.x).toBeCloseTo(0, 0)
    expect(v.y).toBe(0)
    // North = +1° lat => north > 0 => Z = -north => negative Z
    expect(v.z).toBeCloseTo(-METERS_PER_DEGREE_LAT, -2)
  })

  it('maps 1° south of reference to negative North (positive Z)', () => {
    const refLat = 0
    const refLon = 0
    const v = gpsToVector3(refLat - 1, refLon, refLat, refLon)
    expect(v.x).toBeCloseTo(0, 0)
    expect(v.y).toBe(0)
    expect(v.z).toBeCloseTo(METERS_PER_DEGREE_LAT, -2)
  })

  it('maps 1° east of reference at equator to positive X (East)', () => {
    const refLat = 0
    const refLon = 0
    const v = gpsToVector3(refLat, refLon + 1, refLat, refLon)
    expect(v.x).toBeCloseTo(METERS_PER_DEGREE_LAT, -2)
    expect(v.y).toBe(0)
    expect(v.z).toBeCloseTo(0, 0)
  })

  it('maps 1° west of reference at equator to negative X (West)', () => {
    const refLat = 0
    const refLon = 0
    const v = gpsToVector3(refLat, refLon - 1, refLat, refLon)
    expect(v.x).toBeCloseTo(-METERS_PER_DEGREE_LAT, -2)
    expect(v.y).toBe(0)
    expect(v.z).toBeCloseTo(0, 0)
  })

  it('scales longitude by cos(lat) at mid-latitude', () => {
    const refLat = 40
    const refLon = 0
    const oneDegEastMeters = (Math.PI / 180) * 6_371_000 * Math.cos((refLat * Math.PI) / 180)
    const v = gpsToVector3(refLat, refLon + 1, refLat, refLon)
    expect(v.x).toBeCloseTo(oneDegEastMeters, -2)
    expect(v.y).toBe(0)
    expect(v.z).toBeCloseTo(0, 0)
  })

  it('returns Vector3 with Y = 0 (no elevation)', () => {
    const v = gpsToVector3(45, -122, 0, 0)
    expect(v.y).toBe(0)
  })
})
