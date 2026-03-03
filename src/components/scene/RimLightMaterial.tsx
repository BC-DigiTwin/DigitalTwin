/*
 * Rim Light Material — extends MeshStandardMaterial with a rim (Fresnel-edge) glow.
 *
 * Uses dot(View, Normal): rim = 1 − max(0, N·V), then pow(rim, rimPower) * rimIntensity.
 * Edges (normal perpendicular to view) get bright; surfaces facing the camera stay dark.
 *
 * Injects into the built-in fragment shader via onBeforeCompile; keeps PBR lighting.
 */
import React, { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { RIM_LIGHT_DEFAULTS } from '../../constants/sceneMaterials'

function toColor(c: string | THREE.Color): THREE.Color {
  return c instanceof THREE.Color ? c : new THREE.Color(c)
}

/**
 * Pure rim factor: 1 − max(0, N·V), then pow(rim, power) * intensity.
 * Used by the shader; exported for unit tests.
 */
export function computeRimFactor(
  normal: { x: number; y: number; z: number },
  viewDir: { x: number; y: number; z: number },
  power: number,
  intensity: number
): number {
  const dotNV = Math.max(0, normal.x * viewDir.x + normal.y * viewDir.y + normal.z * viewDir.z)
  const rim = 1 - dotNV
  return Math.pow(rim, power) * intensity
}

/** Fragment snippet: add rim to outgoingLight before it is written to gl_FragColor. */
const RIM_FRAGMENT_SNIPPET = `
  vec3 viewDir = normalize( vViewPosition );
  float rim = 1.0 - max( 0.0, dot( normal, viewDir ) );
  rim = pow( rim, rimPower ) * rimIntensity;
  outgoingLight += rimColor * rim;
`

/** Uniform declarations to inject into the fragment shader. */
const RIM_UNIFORM_DECLARATIONS = `
  uniform vec3 rimColor;
  uniform float rimPower;
  uniform float rimIntensity;
`

/** Props: standard MeshStandardMaterial props plus rim light controls. */
export interface RimLightMaterialProps {
  color?: string | number | THREE.Color
  /** Color of the rim glow (default from sceneMaterials). */
  rimColor?: string | THREE.Color
  /** Edge sharpness: higher = thinner rim (default 3). */
  rimPower?: number
  /** Brightness of the rim (default 1). */
  rimIntensity?: number
  [key: string]: unknown
}

/**
 * MeshStandardMaterial with rim light: glowing edge from dot(viewDir, normal).
 * Use in place of <meshStandardMaterial> for any mesh.
 */
export function RimLightMaterial({
  rimColor = RIM_LIGHT_DEFAULTS.rimColor,
  rimPower = RIM_LIGHT_DEFAULTS.rimPower,
  rimIntensity = RIM_LIGHT_DEFAULTS.rimIntensity,
  ...standardProps
}: RimLightMaterialProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)
  // Store uniform refs so we can update .value when props change (shader compiles once)
  const uniformsRef = useRef({
    rimColor: { value: toColor(rimColor) },
    rimPower: { value: rimPower },
    rimIntensity: { value: rimIntensity },
  })

  useLayoutEffect(() => {
    uniformsRef.current.rimColor.value.copy(toColor(rimColor))
    uniformsRef.current.rimPower.value = rimPower
    uniformsRef.current.rimIntensity.value = rimIntensity
  }, [rimColor, rimPower, rimIntensity])

  useLayoutEffect(() => {
    const material = materialRef.current
    if (!material) return

    material.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniformsRef.current)

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>${RIM_UNIFORM_DECLARATIONS}`
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `${RIM_FRAGMENT_SNIPPET}\n\t#include <opaque_fragment>`
      )
    }
  }, [])

  return <meshStandardMaterial ref={materialRef} {...standardProps} />
}
