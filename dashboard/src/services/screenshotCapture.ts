/**
 * screenshotCapture — Issue #628
 *
 * Captures a simplified visual representation of the current page using the
 * native Canvas API (no third-party dependencies). Stores captures in
 * localStorage keyed by error ID with a 7-day TTL.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreenshotMetadata {
  errorId: string
  dataUrl: string
  timestamp: string
  url: string
  userAgent: string
}

interface StoredEntry {
  dataUrl: string
  timestamp: string
  url: string
  userAgent: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'proxypay-screenshot-'
const MAX_DIMENSION = 1280

// ---------------------------------------------------------------------------
// captureScreenshot
// ---------------------------------------------------------------------------

/**
 * Captures a simplified visual representation of the current viewport.
 *
 * Since html2canvas is not available, we create a canvas at the current
 * viewport dimensions and render a structured layout by walking the
 * top-level DOM children and drawing coloured rectangles proportional to
 * each element's bounding box. This gives crash reporters enough visual
 * context to understand which widget/section was visible at the time of
 * the error.
 *
 * Returns a base64-encoded PNG data URL.
 */
export async function captureScreenshot(): Promise<string> {
  return new Promise<string>((resolve) => {
    const w = Math.min(window.innerWidth, MAX_DIMENSION)
    const h = Math.min(window.innerHeight, MAX_DIMENSION)
    const scaleX = w / window.innerWidth
    const scaleY = h / window.innerHeight

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      resolve('')
      return
    }

    // Background
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, w, h)

    // Walk DOM elements and paint approximate bounding boxes
    const walk = (element: Element, depth: number) => {
      if (depth > 4) return

      const rect = element.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return

      const x = Math.round(rect.left * scaleX)
      const y = Math.round(rect.top * scaleY)
      const ew = Math.round(rect.width * scaleX)
      const eh = Math.round(rect.height * scaleY)

      if (x + ew < 0 || y + eh < 0 || x > w || y > h) return

      const tag = element.tagName.toLowerCase()
      const alpha = Math.max(0.06, 0.18 - depth * 0.03)

      // Choose a colour hint based on tag type
      if (['header', 'nav'].includes(tag)) {
        ctx.fillStyle = `rgba(46, 133, 85, ${alpha})`
      } else if (['main', 'section', 'article'].includes(tag)) {
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`
      } else if (['button'].includes(tag)) {
        ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`
      } else if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
        ctx.fillStyle = `rgba(100, 116, 139, ${alpha + 0.1})`
      } else {
        ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`
      }

      ctx.fillRect(x, y, ew, eh)

      // Stroke only for block-level elements
      if (depth <= 2) {
        ctx.strokeStyle = `rgba(100, 116, 139, ${alpha})`
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, ew, eh)
      }

      for (const child of element.children) {
        walk(child, depth + 1)
      }
    }

    // Paint the body's direct children
    for (const child of document.body.children) {
      walk(child, 0)
    }

    // Overlay watermark text
    ctx.fillStyle = 'rgba(100, 116, 139, 0.5)'
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText(
      `ProxyPay Error Capture — ${new Date().toISOString()}`,
      8,
      h - 6,
    )

    resolve(canvas.toDataURL('image/png'))
  })
}

// ---------------------------------------------------------------------------
// storeScreenshot
// ---------------------------------------------------------------------------

/**
 * Stores a screenshot data URL in localStorage with metadata.
 */
export function storeScreenshot(errorId: string, dataUrl: string): void {
  const entry: StoredEntry = {
    dataUrl,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  }
  try {
    localStorage.setItem(`${KEY_PREFIX}${errorId}`, JSON.stringify(entry))
  } catch {
    // Quota exceeded — clean up old entries and retry once
    cleanupOldScreenshots(1)
    try {
      localStorage.setItem(`${KEY_PREFIX}${errorId}`, JSON.stringify(entry))
    } catch {
      // Still can't store — silently fail
    }
  }
}

// ---------------------------------------------------------------------------
// getScreenshot
// ---------------------------------------------------------------------------

/**
 * Retrieves a stored screenshot by error ID. Returns null if not found.
 */
export function getScreenshot(errorId: string): ScreenshotMetadata | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${errorId}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as StoredEntry
    return { errorId, ...entry }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// cleanupOldScreenshots
// ---------------------------------------------------------------------------

/**
 * Removes all stored screenshots older than `maxAgeDays` days.
 */
export function cleanupOldScreenshots(maxAgeDays = 7): void {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(KEY_PREFIX)) continue
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const entry = JSON.parse(raw) as StoredEntry
      if (new Date(entry.timestamp).getTime() < cutoff) {
        keysToRemove.push(key)
      }
    } catch {
      // Corrupt entry — remove it
      keysToRemove.push(key ?? '')
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

// ---------------------------------------------------------------------------
// listScreenshots
// ---------------------------------------------------------------------------

/**
 * Returns metadata for all stored screenshots, newest first.
 */
export function listScreenshots(): Omit<ScreenshotMetadata, 'dataUrl'>[] {
  const results: Omit<ScreenshotMetadata, 'dataUrl'>[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(KEY_PREFIX)) continue
    const errorId = key.slice(KEY_PREFIX.length)
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const entry = JSON.parse(raw) as StoredEntry
      results.push({
        errorId,
        timestamp: entry.timestamp,
        url: entry.url,
        userAgent: entry.userAgent,
      })
    } catch {
      // Skip corrupt entries
    }
  }

  return results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}
