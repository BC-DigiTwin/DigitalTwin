/*
 * Rim Light Material — extends MeshStandardMaterial with a rim (Fresnel-edge) glow.
 *
 * Uses dot(View, Normal): rim = 1 − max(0, N·V), then pow(rim, rimPower) * uIntensity.
 * Edges get bright; surfaces facing the camera stay dark. Optional pulse via uTime and uPulseSpeed.
 *
 * Exposes uniforms: uColor, uIntensity, uTime, uPulseSpeed (and rimPower).
 * Injects into the built-in fragment shader via onBeforeCompile; keeps PBR lighting.
 */
import React, { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
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

/**
 * Pulse factor from time and speed: 0.5 + 0.5 * sin(time * speed).
 * Exported for unit tests.
 */
export function computePulseFactor(time: number, speed: number): number {
  return 0.5 + 0.5 * Math.sin(time * speed)
}

/** Fragment snippet: add rim (with pulse) to outgoingLight before it is written to gl_FragColor. */
const RIM_FRAGMENT_SNIPPET = `
  vec3 viewDir = normalize( vViewPosition );
  float rim = 1.0 - max( 0.0, dot( normal, viewDir ) );
  rim = pow( rim, rimPower ) * uIntensity;
  float pulse = 0.5 + 0.5 * sin( uTime * uPulseSpeed );
  outgoingLight += uColor * rim * pulse;
`

/** Uniform declarations to inject into the fragment shader. */
const RIM_UNIFORM_DECLARATIONS = `
  uniform vec3 uColor;
  uniform float rimPower;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uPulseSpeed;
`

/** Props: standard MeshStandardMaterial props plus rim light / pulse controls. */
export interface RimLightMaterialProps {
  color?: string | number | THREE.Color
  /** Color of the rim glow (default from sceneMaterials). */
  uColor?: string | THREE.Color
  /** Edge sharpness: higher = thinner rim (default 3). */
  rimPower?: number
  /** Brightness of the rim (default 1). */
  uIntensity?: number
  /** Radians per second for pulse (default 2). uTime is driven by the R3F clock. */
  uPulseSpeed?: number
  [key: string]: unknown
}

/**
 * MeshStandardMaterial with rim light: glowing edge from dot(viewDir, normal).
 * Pulse is controlled by uTime (from R3F clock) and uPulseSpeed.
 * Use in place of <meshStandardMaterial> for any mesh.
 */
export function RimLightMaterial({
  uColor: uColorProp = RIM_LIGHT_DEFAULTS.uColor,
  rimPower = RIM_LIGHT_DEFAULTS.rimPower,
  uIntensity = RIM_LIGHT_DEFAULTS.uIntensity,
  uPulseSpeed = RIM_LIGHT_DEFAULTS.uPulseSpeed,
  ...standardProps
}: RimLightMaterialProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)
  const clock = useThree((s) => s.clock)
  const uniformsRef = useRef({
    uColor: { value: toColor(uColorProp) },
    rimPower: { value: rimPower },
    uIntensity: { value: uIntensity },
    uTime: { value: 0 },
    uPulseSpeed: { value: uPulseSpeed },
  })

  useLayoutEffect(() => {
    uniformsRef.current.uColor.value.copy(toColor(uColorProp))
    uniformsRef.current.rimPower.value = rimPower
    uniformsRef.current.uIntensity.value = uIntensity
    uniformsRef.current.uPulseSpeed.value = uPulseSpeed
  }, [uColorProp, rimPower, uIntensity, uPulseSpeed])

  useFrame(() => {
    uniformsRef.current.uTime.value = clock.getElapsedTime()
  })

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
