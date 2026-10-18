export interface ExternalUrlValidation {
  url: URL
  trusted: boolean
}

export interface CorsDiagnostic {
  checkedAt: string
  allowOrigin: string | null
  allowCredentials: boolean
  status: 'permissive' | 'restricted' | 'unavailable'
}

let lastCorsDiagnostic: CorsDiagnostic | null = null
const corsDiagnosticListeners = new Set<(diagnostic: CorsDiagnostic) => void>()

export function validateExternalUrl(
  value: string,
  currentOrigin: string,
  trustedDomains: readonly string[] = []
): ExternalUrlValidation | null {
  try {
    const origin = new URL(currentOrigin)
    const url = new URL(value, origin)
    const sameOrigin = url.origin === origin.origin
    if ((!sameOrigin && url.protocol !== 'https:') || url.username || url.password) return null

    const trusted =
      sameOrigin ||
      trustedDomains.some((domain) => {
        const normalizedDomain = domain.trim().toLowerCase().replace(/^\.+|\.+$/g, '')
        const hostname = url.hostname.toLowerCase()
        return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`)
      })

    return { url, trusted }
  } catch {
    return null
  }
}

export function sanitizeErrorMessage(error: unknown, secret?: string): string {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  const sanitized = message
    .replace(/(bearer\s+)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|token)[=:]\s*)[^\s&,;]+/gi, '$1[REDACTED]')
  return secret ? sanitized.split(secret).join('[REDACTED]') : sanitized
}

export function getCorsDiagnostic(): CorsDiagnostic | null {
  return lastCorsDiagnostic
}

export function subscribeCorsDiagnostic(
  listener: (diagnostic: CorsDiagnostic) => void
): () => void {
  corsDiagnosticListeners.add(listener)
  return () => corsDiagnosticListeners.delete(listener)
}

export function inspectCorsHeaders(
  headers: Record<string, unknown>,
  expectedOrigin: string
): CorsDiagnostic {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([name, value]) => [name.toLowerCase(), String(value)])
  )
  const allowOrigin = normalizedHeaders['access-control-allow-origin'] || null
  const allowCredentials = normalizedHeaders['access-control-allow-credentials']?.toLowerCase() === 'true'
  const status: CorsDiagnostic['status'] =
    allowOrigin === '*'
      ? 'permissive'
      : allowOrigin === expectedOrigin
        ? 'restricted'
        : 'unavailable'

  const diagnostic = {
    checkedAt: new Date().toISOString(),
    allowOrigin,
    allowCredentials,
    status,
  }
  lastCorsDiagnostic = diagnostic
  corsDiagnosticListeners.forEach((listener) => listener(diagnostic))
  return diagnostic
}