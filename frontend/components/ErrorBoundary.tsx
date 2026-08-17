'use client'
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { friendlyUserError } from '@/lib/api'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">{friendlyUserError(this.state.error.message)}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white
                         text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RotateCcw className="w-4 h-4" aria-hidden />
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
