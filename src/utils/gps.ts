import { Vector3 } from 'three'

/** Earth radius in meters (WGS84 equatorial approximation). */
const EARTH_RADIUS_M = 6_371_000

/**
 * Converts real-world GPS coordinates to local scene coordinates (Vector3).
 * Scene origin (0, 0, 0) corresponds to the reference point (refLat, refLon).
 * Units are meters; Y is 0 (no elevation). X = East, Z = -North so that Three.js
 * forward (-Z) points North and the default camera has "North up" on screen.
 *
 * @param lat - Latitude (degrees)
 * @param lon - Longitude (degrees)
 * @param refLat - Reference latitude for scene origin (0,0,0). Default 0.
 * @param refLon - Reference longitude for scene origin (0,0,0). Default 0.
 * @returns Vector3 in scene units (meters): (east, 0, -north)
 */
export function gpsToVector3(
  lat: number,
  lon: number,
  refLat: number = 0,
  refLon: number = 0
): Vector3 {
  const latRad = (refLat * Math.PI) / 180
  const metersPerDegreeLat = (Math.PI / 180) * EARTH_RADIUS_M
  const metersPerDegreeLon = (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(latRad)

  const north = (lat - refLat) * metersPerDegreeLat
  const east = (lon - refLon) * metersPerDegreeLon

  return new Vector3(east, 0, -north)
}
