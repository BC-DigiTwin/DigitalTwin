import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useStore } from '../store/useStore'
import { PlaceholderBox } from './PlaceholderBox'

interface Props {
  children: ReactNode
  /**
   * R3F element rendered in place of the broken subtree.
   * Defaults to a red `<PlaceholderBox />`.
   */
  fallback?: ReactNode
  /** Change this value to reset the boundary and retry loading. */
  resetKey?: string | number
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary that catches asset-loading failures (e.g. missing GLB,
 * network errors in useGLTF / useLoader).
 *
 * Lives *inside* the `<Canvas>` so it can catch R3F suspend errors.
 * When a failure is caught the boundary:
 *   1. Sets `appState` → `'error'` and stores the message in `assetError`
 *      so the HTML-layer `<LoadingScreen>` can display it.
 *   2. Renders a red `<PlaceholderBox>` (or a custom `fallback`) so the
 *      scene still shows something where the model should be.
 *
 * To retry, bump the `resetKey` prop.
 */
export class AssetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const message = error.message || 'Unknown asset loading error'
    console.error('[AssetErrorBoundary]', message, info.componentStack)

    const { setAppState, setAssetError } = useStore.getState()
    setAssetError(message)
    setAppState('error')
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      const { setAppState, setAssetError } = useStore.getState()
      setAssetError(null)
      setAppState('loading')
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <PlaceholderBox />
    }
    return this.props.children
  }
}
