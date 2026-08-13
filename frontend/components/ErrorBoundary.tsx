'use client'
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card p-8 border-red-200 bg-red-50 text-center max-w-lg mx-auto mt-8"
             role="alert">
          <p className="text-4xl mb-3" aria-hidden>⚠️</p>
          <h2 className="font-semibold text-red-800 mb-1">Something went wrong</h2>
          <p className="text-sm text-red-600 mb-4">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-primary text-sm"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
