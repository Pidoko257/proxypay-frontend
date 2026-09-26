const REDIRECT_KEY = 'proxypay.session.redirect'
const SCROLL_KEY = 'proxypay.session.scroll'

export interface SessionRedirect {
  path: string
  scrollY: number
}

const isSafeInternalPath = (path: string): boolean =>
  path.startsWith('/') && !path.startsWith('//')

export const storeSessionRedirect = (
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
): void => {
  if (!isSafeInternalPath(location.pathname)) return

  sessionStorage.setItem(
    REDIRECT_KEY,
    JSON.stringify({ path: `${location.pathname}${location.search}${location.hash}`, scrollY: window.scrollY }),
  )
}

export const consumeSessionRedirect = (): SessionRedirect | null => {
  const value = sessionStorage.getItem(REDIRECT_KEY)
  sessionStorage.removeItem(REDIRECT_KEY)

  if (!value) return null

  try {
    const redirect = JSON.parse(value) as SessionRedirect
    return isSafeInternalPath(redirect.path) ? redirect : null
  } catch {
    return null
  }
}

export const rememberScrollPosition = (location: Location): void => {
  if (isSafeInternalPath(location.pathname)) {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
  }
}

export const restoreScrollPosition = (scrollY: number): void => {
  window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }))
}

export const sessionRestorationKeys = { REDIRECT_KEY, SCROLL_KEY }