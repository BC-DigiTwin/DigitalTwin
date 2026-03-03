import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DebugWrapper } from './DebugWrapper'
import { useStore } from '../store/useStore'

// Mock the store
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}))

// Mock leva (DebugWrapper only renders Leva, not Perf)
vi.mock('leva', () => ({
  Leva: ({ hidden }: { hidden: boolean }) => (
    <div data-testid="leva" data-hidden={String(hidden)}>
      Leva Panel
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

  it('hides Leva when debugMode is false', () => {
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )

    const leva = screen.getByTestId('leva')
    expect(leva).toHaveAttribute('data-hidden', 'true')
  })

  it('shows Leva when debugMode is true', () => {
    ;(useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>
    )

    const leva = screen.getByTestId('leva')
    expect(leva).toHaveAttribute('data-hidden', 'false')
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
