import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DebugWrapper } from './DebugWrapper'
import { useStore } from '../store/useStore'

// Mock leva (anchor `Leva` stays hidden; drawer uses `LevaPanel`)
vi.mock('leva', () => ({
  Leva: ({ hidden }: { hidden: boolean }) => (
    <div data-testid="leva" data-hidden={String(hidden)}>
      Leva anchor
    </div>
  ),
  LevaPanel: () => <div data-testid="leva-panel">Leva panel</div>,
  levaStore: {},
}))

describe('DebugWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({ showPerfOverlay: false })
  })

  it('renders children', () => {
    render(
      <DebugWrapper>
        <div data-testid="child">Child Content</div>
      </DebugWrapper>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('always mounts a hidden Leva anchor (suppresses stray global panel)', () => {
    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>,
    )

    const leva = screen.getByTestId('leva')
    expect(leva).toHaveAttribute('data-hidden', 'true')
  })

  it('opens the drawer with LevaPanel when ` is pressed', () => {
    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>,
    )

    fireEvent.keyDown(window, { key: '`' })

    expect(screen.getByTestId('scene-options-drawer')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('leva-panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('toggles the drawer closed when ` is pressed again', () => {
    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>,
    )

    fireEvent.keyDown(window, { key: '`' })
    expect(screen.getByTestId('scene-options-drawer')).toHaveAttribute('data-open', 'true')

    fireEvent.keyDown(window, { key: '`' })
    expect(screen.getByTestId('scene-options-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('closes the drawer on Escape', () => {
    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>,
    )

    fireEvent.keyDown(window, { key: '`' })
    expect(screen.getByTestId('leva-panel')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByTestId('scene-options-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('toggles performance stats overlay from the drawer', () => {
    render(
      <DebugWrapper>
        <div>Content</div>
      </DebugWrapper>,
    )

    fireEvent.keyDown(window, { key: '`' })

    const perfToggle = screen.getByRole('checkbox', {
      name: /show performance stats/i,
    })
    expect(perfToggle).not.toBeChecked()

    fireEvent.click(perfToggle)
    expect(useStore.getState().showPerfOverlay).toBe(true)

    fireEvent.click(perfToggle)
    expect(useStore.getState().showPerfOverlay).toBe(false)
  })
})
