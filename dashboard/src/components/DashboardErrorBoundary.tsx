import React from 'react'
import * as Sentry from '@sentry/react'
import { captureScreenshot, storeScreenshot } from '../services/screenshotCapture'
import { ErrorScreenshotDialog } from './ErrorScreenshotDialog'

interface DashboardErrorBoundaryProps {
  children: React.ReactNode
}

interface DashboardErrorBoundaryState {
  error: Error | null
  eventId: string | null
  detailsOpen: boolean
}

export interface ValidationIssue {
  path: string
  message: string
}

interface ValidationErrorLike extends Error {
  issues?: ValidationIssue[]
}

const MAX_SUMMARY_ISSUES = 3

function getValidationIssues(error: Error): ValidationIssue[] {
  const issues = (error as ValidationErrorLike).issues
  if (!Array.isArray(issues)) return []
  return issues.filter(
    (issue): issue is ValidationIssue =>
      !!issue && typeof issue.path === 'string' && typeof issue.message === 'string',
  )
}

export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  state: DashboardErrorBoundaryState = { error: null, eventId: null, detailsOpen: false }

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { error, eventId: null, detailsOpen: false }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard component error', error, info.componentStack)
    const issues = getValidationIssues(error)
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
      if (issues.length > 0) {
        scope.setContext('validation_issues', {
          count: issues.length,
          issues: issues.map((issue) => ({ path: issue.path, message: issue.message })),
        })
      }
      scope.setFingerprint(['{{ default }}', 'DashboardApp'])
      eventId = Sentry.captureException(error)
    })
    const capturedEventId = eventId ?? null
    this.setState({ eventId: capturedEventId })

    // Capture and store screenshot asynchronously
    const errorId = capturedEventId ?? `error-${Date.now()}`
    captureScreenshot()
      .then((dataUrl) => {
        if (dataUrl) {
          storeScreenshot(errorId, dataUrl)
          this.setState({ screenshotDataUrl: dataUrl })
        }
      })
      .catch((err) => {
        console.warn('Screenshot capture failed', err)
      })
  }

  render() {
    const { error, eventId, detailsOpen } = this.state
    if (!error) return this.props.children

    const issues = getValidationIssues(error)
    const hasIssues = issues.length > 0
    const summaryIssues = issues.slice(0, MAX_SUMMARY_ISSUES)
    const remaining = issues.length - summaryIssues.length

    return (
      <main className="dashboard-error-boundary" role="alert">
        <section>
          <h1>{hasIssues ? 'Document validation failed' : 'Dashboard unavailable'}</h1>
          {hasIssues ? (
            <>
              <p>
                {issues.length === 1
                  ? '1 validation issue was found in the document.'
                  : `${issues.length} validation issues were found in the document.`}
              </p>
              <ul className="dashboard-error-boundary__issues">
                {summaryIssues.map((issue, index) => (
                  <li key={`${issue.path}-${index}`}>
                    <code>{issue.path || '/'}</code> {issue.message}
                  </li>
                ))}
              </ul>
              {remaining > 0 && (
                <p className="dashboard-error-boundary__note">
                  {remaining === 1
                    ? '1 more issue is available in the details below.'
                    : `${remaining} more issues are available in the details below.`}
                </p>
              )}
              <details
                className="dashboard-error-boundary__details"
                open={detailsOpen}
                onToggle={(event) =>
                  this.setState({ detailsOpen: event.currentTarget.open })
                }
              >
                <summary>Show all validation issues</summary>
                <ul>
                  {issues.map((issue, index) => (
                    <li key={`${issue.path}-${index}`}>
                      <code>{issue.path || '/'}</code> {issue.message}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p>
              An unexpected error interrupted this page. The report contains component and page
              context, but does not include form values.
            </p>
          )}
          <div className="dashboard-error-boundary__actions">
            <button
              type="button"
              onClick={() => this.setState({ error: null, eventId: null, detailsOpen: false })}
            >
              Try again
            </button>
            {eventId && import.meta.env.VITE_SENTRY_DSN && (
              <button type="button" onClick={() => Sentry.showReportDialog({ eventId })}>
                Send feedback
              </button>
            )}
            <button
              type="button"
              onClick={() => this.setState({ showScreenshotDialog: true })}
            >
              View Screenshot
            </button>
          </div>
          {!import.meta.env.VITE_SENTRY_DSN && (
            <p className="dashboard-error-boundary__note">
              Error reporting is not configured for this deployment.
            </p>
          )}
        </section>

        <ErrorScreenshotDialog
          isOpen={showScreenshotDialog}
          onClose={() => this.setState({ showScreenshotDialog: false })}
          errorMessage={error.message}
          timestamp={new Date().toISOString()}
          screenshotDataUrl={screenshotDataUrl ?? undefined}
        />
      </main>
    )
  }
}