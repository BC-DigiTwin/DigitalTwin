import { useGLTF } from "@react-three/drei";

const DRACO_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

/**
 * Custom hook that wraps `useGLTF` with Draco decoder support via Google CDN.
 *
 * @param path - URL or public-relative path to a `.glb` / `.gltf` asset.
 * @returns The loaded GLTF result (scene, nodes, materials, etc.).
 */
export function useAssetLoader(path: string) {
  return useGLTF(path, DRACO_CDN);
}

/**
 * Pre-fetch an asset so it is already cached when the component mounts.
 *
 * @example
 * ```ts
 * useAssetLoader.preload("/models/campus.glb");
 * ```
 */
useAssetLoader.preload = (path: string): void => {
  useGLTF.preload(path, DRACO_CDN);
};
