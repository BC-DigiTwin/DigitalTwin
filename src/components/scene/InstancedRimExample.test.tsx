/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { InstancedRimExample } from './InstancedRimExample'

vi.mock('@react-three/fiber', () => ({
  ...vi.importActual('@react-three/fiber'),
  useFrame: (fn: () => void) => {
    fn()
  },
  useThree: (selector?: (s: { clock: { getElapsedTime: () => number } }) => unknown) =>
    selector ? selector({ clock: { getElapsedTime: () => 0 } }) : { clock: { getElapsedTime: () => 0 } },
}))

let instancedRimVisible = true
vi.mock('../../store/useStore', () => ({
  useStore: (selector: (s: unknown) => unknown) =>
    selector({
      layers: { instancedRim: instancedRimVisible },
    }),
}))

describe('InstancedRimExample', () => {
  beforeEach(() => {
    instancedRimVisible = true
  })

  it('renders without throwing when layer is visible', () => {
    expect(() => render(<InstancedRimExample />)).not.toThrow()
  })

  it('returns null when instancedRim layer is false', () => {
    instancedRimVisible = false
    const { container } = render(<InstancedRimExample />)
    expect(container.firstChild).toBeNull()
  })
})
