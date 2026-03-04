/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { RimLightMaterial, computeRimFactor, computePulseFactor } from './RimLightMaterial'

const mockClock = { getElapsedTime: () => 0 }

// R3F primitives and hooks: avoid real Canvas/clock; RimLightMaterial uses useFrame + useThree for uTime
vi.mock('@react-three/fiber', () => ({
  ...vi.importActual('@react-three/fiber'),
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: (fn: () => void) => { fn() },
  useThree: (selector?: (s: { clock: typeof mockClock }) => unknown) =>
    selector ? selector({ clock: mockClock }) : { clock: mockClock },
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

  it('scales by uIntensity', () => {
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

describe('computePulseFactor', () => {
  it('returns 0.5 when sin(time * speed) is 0', () => {
    expect(computePulseFactor(0, 1)).toBeCloseTo(0.5)
    expect(computePulseFactor(Math.PI, 1)).toBeCloseTo(0.5)
  })

  it('returns 1 when sin(time * speed) is 1', () => {
    expect(computePulseFactor(Math.PI / 2, 1)).toBeCloseTo(1)
  })

  it('returns 0 when sin(time * speed) is -1', () => {
    expect(computePulseFactor((3 * Math.PI) / 2, 1)).toBeCloseTo(0)
  })

  it('scales pulse period by speed', () => {
    expect(computePulseFactor(1, 2)).not.toBe(computePulseFactor(1, 1))
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

  it('accepts uColor, uIntensity, and uPulseSpeed and renders', () => {
    expect(() =>
      render(
        <div data-testid="wrapper">
          <RimLightMaterial color="#ff0000" uColor="#00ffff" uIntensity={1.5} uPulseSpeed={3} />
        </div>
      )
    ).not.toThrow()
  })

  it('accepts useInstanceRimIntensity and renders without throwing', () => {
    expect(() =>
      render(
        <div data-testid="wrapper">
          <RimLightMaterial color="#888888" useInstanceRimIntensity />
        </div>
      )
    ).not.toThrow()
  })
})
