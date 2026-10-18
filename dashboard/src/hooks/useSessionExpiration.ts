import { useCallback, useEffect, useState } from 'react'
import { proxyPayAPI } from '../services/api'

const WARNING_WINDOW_MS = 5 * 60 * 1000

interface SessionState {
  expiresAt: number | null
  showWarning: boolean
  secondsRemaining: number
}

function getTokenExpiration(token: string | null): number | null {
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function useSessionExpiration(onExpired: () => void) {
  const [session, setSession] = useState<SessionState>(() => {
    const expiresAt = getTokenExpiration(localStorage.getItem('auth_token'))
    return {
      expiresAt,
      showWarning: false,
      secondsRemaining: expiresAt
        ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
        : 0,
    }
  })

  const signOut = useCallback(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('proxypay-incomplete-action')
    onExpired()
  }, [onExpired])

  const extendSession = useCallback(async () => {
    try {
      const token = await proxyPayAPI.refreshSession()
      const expiresAt = getTokenExpiration(token)
      setSession({
        expiresAt,
        showWarning: false,
        secondsRemaining: expiresAt
          ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
          : 0,
      })
    } catch {
      signOut()
    }
  }, [signOut])

  useEffect(() => {
    if (!session.expiresAt) return

    const interval = window.setInterval(() => {
      const millisecondsRemaining = session.expiresAt! - Date.now()
      if (millisecondsRemaining <= 0) {
        window.clearInterval(interval)
        signOut()
        return
      }

      setSession((current) => ({
        ...current,
        showWarning: millisecondsRemaining <= WARNING_WINDOW_MS,
        secondsRemaining: Math.ceil(millisecondsRemaining / 1000),
      }))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [session.expiresAt, signOut])

  return { ...session, extendSession, signOut }
}
