import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Smoke test for the test toolchain itself. It exercises the full chain:
// vitest + jsdom (render), @vitejs/plugin-react (JSX transform), and the
// @testing-library/jest-dom matchers wired in via src/test/setup.ts.
//
// If src/test/setup.ts stops importing '@testing-library/jest-dom', the
// assertion below fails with "toBeInTheDocument is not a function" — which is
// exactly the failure this setup exists to prevent.
describe('vitest test setup', () => {
  it('registers @testing-library/jest-dom matchers', () => {
    render(<button>Save</button>)
    expect(
      screen.getByRole('button', { name: 'Save' }),
    ).toBeInTheDocument()
  })
})
