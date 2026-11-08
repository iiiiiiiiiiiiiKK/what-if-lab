import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

interface State {
  hasError: boolean
}

/** Prevents a rendering exception from blanking the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never log user hypothesis text or API keys here.
    console.error('[what-if-lab] render error:', error.message, info.componentStack?.slice(0, 400))
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
