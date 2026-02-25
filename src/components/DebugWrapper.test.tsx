import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DebugWrapper } from './DebugWrapper'
import { useStore } from '../store/useStore'

// Mock the store
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}))

// Mock leva and r3f-perf
vi.mock('leva', () => ({
  Leva: ({ hidden }: { hidden: boolean }) => (
    <div data-testid="leva" data-hidden={hidden}>
      Leva Panel
    </div>
  ),
}))

vi.mock('r3f-perf', () => ({
  Perf: ({ position }: { position: string }) => (
    <div data-testid="perf" data-position={position}>
      Performance Monitor
    </div>
  ),
}))

describe('DebugWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children regardless of debugMode', () => {
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    render(
      <DebugWrapper>
        <div data-testid="child">Child Content</div>
      </DebugWrapper>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('hides Leva and Perf when debugMode is false', () => {
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )

    const leva = screen.getByTestId('leva')
    expect(leva).toHaveAttribute('data-hidden', 'true')
    expect(screen.queryByTestId('perf')).not.toBeInTheDocument()
  })

  it('shows Leva and Perf when debugMode is true', () => {
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )

    const leva = screen.getByTestId('leva')
    const perf = screen.getByTestId('perf')

    expect(leva).toHaveAttribute('data-hidden', 'false')
    expect(perf).toBeInTheDocument()
    expect(perf).toHaveAttribute('data-position', 'top-left')
  })

  it('configures Perf with top-left position', () => {
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )

    const perf = screen.getByTestId('perf')
    expect(perf).toHaveAttribute('data-position', 'top-left')
  })

  it('configures Leva with hidden prop based on debugMode', () => {
    const { rerender } = render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )

    // Test false state
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)
    rerender(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )
    expect(screen.getByTestId('leva')).toHaveAttribute('data-hidden', 'true')

    // Test true state
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
    rerender(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )
    expect(screen.getByTestId('leva')).toHaveAttribute('data-hidden', 'false')
  })
})
