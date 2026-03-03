/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { RimLightMaterial, computeRimFactor } from './RimLightMaterial'

// R3F primitives (mesh, meshStandardMaterial) are not DOM elements; we only assert the wrapper renders
vi.mock('@react-three/fiber', () => ({
  ...vi.importActual('@react-three/fiber'),
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
}))

describe('computeRimFactor', () => {
  it('returns 0 when normal and view direction align (facing camera)', () => {
    const normal = { x: 0, y: 0, z: 1 }
    const viewDir = { x: 0, y: 0, z: 1 }
    expect(computeRimFactor(normal, viewDir, 3, 1)).toBe(0)
  })

  it('returns intensity when normal and view are perpendicular (edge)', () => {
    const normal = { x: 1, y: 0, z: 0 }
    const viewDir = { x: 0, y: 0, z: 1 }
    const rim = computeRimFactor(normal, viewDir, 3, 1)
    expect(rim).toBe(1)
  })

  it('scales by rimIntensity', () => {
    const normal = { x: 1, y: 0, z: 0 }
    const viewDir = { x: 0, y: 0, z: 1 }
    expect(computeRimFactor(normal, viewDir, 3, 2)).toBe(2)
  })

  it('applies rimPower (higher power sharpens falloff)', () => {
    const normal = { x: 0.5, y: 0.5, z: 0.707 }
    const viewDir = { x: 0, y: 0, z: 1 }
    const low = computeRimFactor(normal, viewDir, 1, 1)
    const high = computeRimFactor(normal, viewDir, 5, 1)
    expect(high).toBeLessThan(low)
  })
})

describe('RimLightMaterial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without throwing', () => {
    expect(() =>
      render(
        <div data-testid="wrapper">
          <RimLightMaterial color="#ff0000" />
        </div>
      )
    ).not.toThrow()
  })
})
