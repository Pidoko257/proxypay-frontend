# Pull Request Description

## Issues Addressed

This PR resolves two related UI issues in the ProxyPay frontend documentation portal:

- **Issue #224** — Fix Inconsistent Font Sizes and Spacing
- **Issue #225** — Fix Unreadable Text in Dark Mode

---

## Issue #224: Fix Inconsistent Font Sizes and Spacing

### Problem

Font sizes and spacing were inconsistent across pages, making the UI feel disjointed. Heading sizes varied, margins and padding were ad-hoc, and line heights were not standardized.

### Root Cause

The `src/css/custom.css` file contained no typography or spacing definitions. All font sizing, line heights, and spacing relied on browser defaults and inline styles, leading to inconsistency across pages and components.

### Changes Made

#### Typography Scale (custom.css)

Added CSS custom properties for a consistent typographic scale:

| Token | Value | Usage |
|---|---|---|
| `--font-size-h1` | `2.5rem` | Page-level headings |
| `--font-size-h2` | `2rem` | Section headings |
| `--font-size-h3` | `1.5rem` | Subsection headings |
| `--font-size-body` | `1rem` | Body text |
| `--font-size-small` | `0.875rem` | Small text, captions |

#### Spacing Scale (custom.css)

Added a standardized spacing scale using CSS custom properties:

| Token | Value |
|---|---|
| `--spacing-xs` | `0.25rem` |
| `--spacing-sm` | `0.5rem` |
| `--spacing-md` | `1rem` |
| `--spacing-lg` | `1.5rem` |
| `--spacing-xl` | `2rem` |
| `--spacing-2xl` | `3rem` |

#### Line Heights (custom.css)

- `--line-height-heading`: `1.3` — tight enough for visual hierarchy, loose enough for readability
- `--line-height-body`: `1.6` — optimized for paragraph readability

#### Applied Consistency

- All heading elements (`h1`–`h6`) now use the typography scale and spacing scale for margins
- Paragraphs use consistent bottom margins via the spacing scale
- Code blocks have standardized padding and line height
- Utility margin/padding classes added for component-level consistency

---

## Issue #225: Fix Unreadable Text in Dark Mode

### Problem

Some text became unreadable in dark mode due to low contrast. Links were indistinguishable by color alone, and code blocks lacked proper dark mode styling.

### Root Cause

The `src/css/custom.css` file had no dark mode overrides. Text colors, link colors, and code block styles were not defined for the `[data-theme="dark"]` context, causing the browser defaults or Docusaurus theme defaults to produce insufficient contrast.

### Changes Made

#### Dark Mode Text Colors (custom.css)

- Body text: `#e0e0e0` on dark background — exceeds WCAG 4.5:1 contrast ratio
- Heading text: `#f0f0f0` — slightly brighter for hierarchy distinction
- Secondary text: `#b0b0b0` — still meets contrast threshold

#### Dark Mode Link Colors (custom.css)

- Default link color: `#6fcf97` — distinguishable from body text with sufficient contrast
- Hover link color: `#a8e6c1` — lighter on hover for visual feedback
- Links always have `text-decoration: underline` with `text-underline-offset: 2px` — ensures distinguishability for color-blind users (not relying on color alone)

#### Dark Mode Code Blocks (custom.css)

- Background: `#282a36` (dracula-inspired, distinct from page background)
- Text color: `#f8f8f2` — high contrast against the code block background
- Inline code: `rgba(255, 255, 255, 0.08)` background with `#e0e0e0` text
- Border: `1px solid rgba(255, 255, 255, 0.1)` — subtle boundary for code block visibility

#### Dark Mode Redoc Wrapper (custom.css)

- Text color: `#e0e0e0` — ensures API reference rendered by Redoc is readable
- Inline code within Redoc: same contrast treatment as other code elements

#### Color Blindness Considerations (custom.css)

- Links use both color AND underline decoration — never relying on color alone
- The `text-decoration` and `text-underline-offset` properties ensure links are distinguishable even in grayscale or color-blind simulations
- Dark mode link colors (`#6fcf97` / `#a8e6c1`) were chosen to be distinguishable from the body text (`#e0e0e0`) even for common forms of color vision deficiency

---

## Files Modified

- `src/css/custom.css` — Added typography scale, spacing scale, line heights, dark mode overrides, and accessibility improvements

## Acceptance Criteria

### Issue #224
- [x] Font sizes follow scale (h1, h2, h3, body, small)
- [x] Margins/padding consistent via spacing scale
- [x] Line height appropriate for readability
- [x] Spacing units standardized via CSS custom properties

### Issue #225
- [x] All text has 4.5:1 contrast ratio or higher in dark mode
- [x] Tested with color blindness simulators (links use underline + color)
- [x] Code blocks readable in dark mode
- [x] Links distinguishable in dark mode

---

## Verification

- Typography scale applied consistently across all heading levels
- Spacing scale used for all margin and padding values
- Dark mode contrast verified against WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Links maintain underline decoration in both light and dark modes
- Code blocks render with appropriate dark mode colors

Closes #224
Closes #225