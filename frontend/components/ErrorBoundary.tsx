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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f6d4bc]">
                <AlertTriangle className="h-8 w-8 text-[#9e4e21]" aria-hidden />
              </div>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[#171a16]">Something went wrong</h2>
            <p className="mb-6 text-sm text-[#73786f]">{friendlyUserError(this.state.error.message)}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#171a16] px-5 py-2.5
                         text-sm font-semibold text-[#f5f4ef] transition-colors hover:bg-[#303a27]"
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
