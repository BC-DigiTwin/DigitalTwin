/**
 * World Origin: real-world (lat, lon) that corresponds to scene (0, 0, 0).
 * All GPS → position math should use this as the reference.
 */
export const WORLD_ORIGIN = {
  lat: 47.5835,    // 47°35'00.6"N
  lon: -122.1493,  // 122°08'57.5"W
} as const