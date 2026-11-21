// Vitest global setup, referenced from vitest.config.ts (test.setupFiles).
//
// Importing '@testing-library/jest-dom' registers the custom DOM matchers
// (toBeInTheDocument, toHaveTextContent, toBeVisible, toHaveAttribute, ...)
// on Vitest's `expect` so they are available in every component test without
// per-file imports. jest-dom v6 auto-extends expect on import — no manual
// `expect.extend` call is required.
import '@testing-library/jest-dom'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount React trees between tests so state and the jsdom document do not
// leak across cases.
afterEach(() => {
  cleanup()
})
