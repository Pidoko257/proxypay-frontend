const allowedNotificationPaths = ['/transactions', '/exports']

export function getSafeNotificationUrl(actionUrl: string): string | null {
  try {
    const url = new URL(actionUrl, window.location.origin)
    if (url.origin !== window.location.origin) return null
    if (
      !allowedNotificationPaths.some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
      )
    ) {
      return null
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
