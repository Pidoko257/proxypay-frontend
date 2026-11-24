const DEFAULT_ALLOWED_NOTIFICATION_PATHS = ['/transactions', '/exports'] as const

export const allowedNotificationPaths: readonly string[] = DEFAULT_ALLOWED_NOTIFICATION_PATHS

export interface SafeNotificationUrlOptions {
  /**
   * Additional path prefixes to allow beyond the default allowlist.
   * Callers can extend the allowlist without forking this utility.
   */
  extraAllowedPaths?: readonly string[]
}

const normalizePath = (path: string): string => {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`
  }
  return trimmed
}

const matchesAllowedPath = (path: string, allowlist: readonly string[]): boolean =>
  allowlist.some((allowed) => {
    const normalizedAllowed = normalizePath(allowed)
    return path === normalizedAllowed || path.startsWith(`${normalizedAllowed}/`)
  })

/**
 * Returns a safe, same-origin relative URL for a notification action, or null
 * when the URL is unsafe or not within the allowlist.
 *
 * The default allowlist is `allowedNotificationPaths`; callers may extend it
 * via `options.extraAllowedPaths` without changing default behavior.
 */
export const getSafeNotificationUrl = (
  rawUrl: string | null | undefined,
  options: SafeNotificationUrlOptions = {}
): string | null => {
  if (!rawUrl) {
    return null
  }

  const candidate = rawUrl.trim()
  if (!candidate) {
    return null
  }

  // Reject absolute URLs, protocol-relative URLs, and anything with a scheme.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate) || candidate.startsWith('//')) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(candidate, 'https://placeholder.invalid')
  } catch {
    return null
  }

  // Only allow same-origin relative navigation.
  if (parsed.origin !== 'https://placeholder.invalid') {
    return null
  }

  const path = parsed.pathname
  const allowlist = [
    ...allowedNotificationPaths,
    ...(options.extraAllowedPaths ?? []),
  ]

  if (!matchesAllowedPath(path, allowlist)) {
    return null
  }

  return `${path}${parsed.search}${parsed.hash}`
}
