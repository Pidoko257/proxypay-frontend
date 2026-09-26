import {
  consumeSessionRedirect,
  restoreScrollPosition,
  storeSessionRedirect,
} from '../sessionRestoration'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('session restoration', () => {
  beforeEach(() => sessionStorage.clear())

  it('stores and consumes an internal redirect with scroll position', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    storeSessionRedirect(new URL('https://example.test/transactions?status=settled'))

    expect(consumeSessionRedirect()).toEqual({
      path: '/transactions?status=settled',
      scrollY: 240,
    })
    expect(consumeSessionRedirect()).toBeNull()
  })

  it('rejects external redirect targets', () => {
    sessionStorage.setItem(
      'proxypay.session.redirect',
      JSON.stringify({ path: 'https://evil.test', scrollY: 0 }),
    )

    expect(consumeSessionRedirect()).toBeNull()
  })

  it('restores the saved scroll position after navigation', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 0
    })

    restoreScrollPosition(240)

    expect(scrollTo).toHaveBeenCalledWith({ top: 240, behavior: 'auto' })
    scrollTo.mockRestore()
  })
})