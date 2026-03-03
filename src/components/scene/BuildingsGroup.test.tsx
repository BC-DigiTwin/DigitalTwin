/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BuildingsGroup, getRimIntensityForBuilding } from './BuildingsGroup'

const mockClock = { getElapsedTime: () => 0 }

// Mock R3F primitives and hooks so BuildingsGroup (and its RimLightMaterial children)
// can render in a jsdom environment without requiring a real Canvas or WebGL context.
vi.mock('@react-three/fiber', () => ({
  ...vi.importActual('@react-three/fiber'),
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: (fn: () => void) => {
    fn()
  },
  useThree: (selector?: (s: { clock: typeof mockClock }) => unknown) =>
    selector ? selector({ clock: mockClock }) : { clock: mockClock },
}))

describe('getRimIntensityForBuilding', () => {
  it('returns 1 when building is hovered', () => {
    expect(getRimIntensityForBuilding(0, 0)).toBe(1)
  })

  it('returns 0 when building is not hovered', () => {
    expect(getRimIntensityForBuilding(1, 0)).toBe(0)
    expect(getRimIntensityForBuilding(0, null)).toBe(0)
  })
})

describe('BuildingsGroup', () => {
  it('renders without crashing', () => {
    expect(() => render(<BuildingsGroup />)).not.toThrow()
  })
})

