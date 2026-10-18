import React from 'react'
import * as Sentry from '@sentry/react'

interface DashboardErrorBoundaryProps {
  children: React.ReactNode
}

interface DashboardErrorBoundaryState {
  error: Error | null
  eventId: string | null
}

export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  state: DashboardErrorBoundaryState = { error: null, eventId: null }

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { error, eventId: null }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard component error', error, info.componentStack)
    let eventId: string | undefined
    Sentry.withScope((scope) => {
      scope.setTag('error.component', 'DashboardApp')
      scope.setContext('react_component', {
        name: 'DashboardApp',
        props: Object.keys(this.props),
        componentStack: info.componentStack,
      })
      scope.setContext('user_action', {
        user: 'anonymous',
        page: window.location.pathname,
        action: 'render',
      })
      scope.setFingerprint(['{{ default }}', 'DashboardApp'])
      eventId = Sentry.captureException(error)
    })
    this.setState({ eventId: eventId ?? null })
  }

  render() {
    const { error, eventId } = this.state
    if (!error) return this.props.children

    return (
      <main className="dashboard-error-boundary" role="alert">
        <section>
          <h1>Dashboard unavailable</h1>
          <p>
            An unexpected error interrupted this page. The report contains component and page
            context, but does not include form values.
          </p>
          <div className="dashboard-error-boundary__actions">
            <button
              type="button"
              onClick={() => this.setState({ error: null, eventId: null })}
            >
              Try again
            </button>
            {eventId && import.meta.env.VITE_SENTRY_DSN && (
              <button type="button" onClick={() => Sentry.showReportDialog({ eventId })}>
                Send feedback
              </button>
            )}
          </div>
          {!import.meta.env.VITE_SENTRY_DSN && (
            <p className="dashboard-error-boundary__note">
              Error reporting is not configured for this deployment.
            </p>
          )}
        </section>
      </main>
    )
  }
}