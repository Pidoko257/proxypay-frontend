import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import { DashboardErrorBoundary } from './components/DashboardErrorBoundary'
import { PortalSearch } from './components/PortalSearch'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
  })
}

const PORTAL_NAME = 'Portal'

const ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  '/': {
    title: `Dashboard | ${PORTAL_NAME}`,
    description: 'Overview of your portal activity, metrics, and recent updates.',
  },
  '/dashboard': {
    title: `Dashboard | ${PORTAL_NAME}`,
    description: 'Overview of your portal activity, metrics, and recent updates.',
  },
  '/settings': {
    title: `Settings | ${PORTAL_NAME}`,
    description: 'Manage your portal account preferences and configuration.',
  },
  '/profile': {
    title: `Profile | ${PORTAL_NAME}`,
    description: 'View and edit your portal profile details.',
  },
}

const DEFAULT_METADATA = {
  title: PORTAL_NAME,
  description: 'Portal application for managing your account and resources.',
}

function applyRouteMetadata(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const metadata = ROUTE_METADATA[normalized] ?? DEFAULT_METADATA
  document.title = metadata.title

  let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta')
    descriptionTag.name = 'description'
    document.head.appendChild(descriptionTag)
  }
  descriptionTag.content = metadata.description
}

applyRouteMetadata(window.location.pathname)
window.addEventListener('popstate', () => applyRouteMetadata(window.location.pathname))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardErrorBoundary>
      <App />
      <PortalSearch />
    </DashboardErrorBoundary>
  </React.StrictMode>,
)
