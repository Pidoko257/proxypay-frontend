# Fix Missing Favicon on All Pages

## Summary

The ProxyPay docs portal had no visible favicon in browser tabs, bookmarks, or on
mobile home screens. The root cause was two-fold:

1. **Wrong format** — `favicon` was set to `img/logo.svg`. Many browsers (older Chrome,
   all versions of Safari on iOS/macOS, Windows taskbar/pinned-sites, and every version
   of IE/Edge Legacy) do not support SVG as a favicon source. They silently ignore the
   tag and display a generic blank icon.

2. **Missing fallback files** — No `.ico` or `.png` favicon files existed in the repo,
   so browsers that support only those formats had nothing to fall back to.

| Criterion | Delivered |
|---|---|
| Favicon appears in browser tab | ✅ `favicon.ico` (16 + 32 + 48 px) served via `<link rel="icon" type="image/x-icon">` |
| Works on all pages | ✅ `headTags` injects into every page's `<head>` globally |
| Appears in bookmarks / home screen | ✅ `apple-touch-icon.png` (180×180) for iOS/macOS; `.ico` for Windows |
| No console errors | ✅ All referenced files exist; no 404s |

---

## Root Cause

```
// Before — SVG-only favicon; ignored by Safari, Windows, older Chrome
favicon: 'img/logo.svg',
```

Browsers select a favicon using `<link rel="icon">` tags in the document `<head>`.
Docusaurus only injects one tag from the `favicon` config key. SVG icons are specified
in the [WHATWG standard](https://html.spec.whatwg.org/#rel-icon) but browser support
is incomplete:

| Format | Chrome | Firefox | Safari | Edge | iOS | Windows |
|--------|--------|---------|--------|------|-----|---------|
| `.ico` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.png` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.svg` | ✅ (v80+) | ✅ (v41+) | ❌ | ✅ (v79+) | ❌ | ❌ |

Without an `.ico` or `.png` fallback, Safari users (desktop and mobile) and anyone
saving the site on Windows see no favicon at all.

---

## Changes

### `static/img/favicon.ico` *(new)*

A multi-resolution ICO file containing three embedded PNG streams:

- **16×16 px** — browser tab (small)
- **32×32 px** — browser tab (retina / high-DPI)
- **48×48 px** — Windows taskbar / pinned site

Each frame renders the ProxyPay brand mark: a green rounded square
(`#2e8555`) with a white ₿ glyph — matching `logo.svg`.

### `static/img/favicon-32x32.png` *(new)*

Standalone 32×32 RGBA PNG. Used by the `<link sizes="32x32">` tag, which modern
browsers (Chrome, Firefox, Edge) prefer over `.ico` when both are present.

### `static/img/favicon-16x16.png` *(new)*

Standalone 16×16 RGBA PNG. Fallback for environments that request small icons
explicitly.

### `static/img/apple-touch-icon.png` *(new)*

180×180 RGBA PNG. Required by iOS Safari and macOS for:
- "Add to Home Screen" icon
- Safari bookmark thumbnails
- macOS Dock if the site is opened as a web app

### `docusaurus.config.ts`

Two targeted changes:

**1. `favicon` field** — changed from SVG to ICO so the automatically injected
`<link rel="shortcut icon">` tag points at a universally supported format:

```diff
- favicon: 'img/logo.svg',
+ favicon: 'img/favicon.ico',
```

**2. `headTags` array** — five additional `<link>` tags injected into every page
`<head>`, giving browsers a full priority list to choose from:

```typescript
headTags: [
  // Legacy browsers, Windows taskbar, IE
  { tagName: 'link', attributes: { rel: 'icon', type: 'image/x-icon',  href: '/proxypay/img/favicon.ico' } },
  // Modern browsers — 32×32
  { tagName: 'link', attributes: { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/proxypay/img/favicon-32x32.png' } },
  // Modern browsers — 16×16 fallback
  { tagName: 'link', attributes: { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/proxypay/img/favicon-16x16.png' } },
  // iOS / macOS Add-to-Home-Screen
  { tagName: 'link', attributes: { rel: 'apple-touch-icon', sizes: '180x180', href: '/proxypay/img/apple-touch-icon.png' } },
  // Modern Chrome/Firefox — SVG (crisp at any DPI)
  { tagName: 'link', attributes: { rel: 'icon', type: 'image/svg+xml', href: '/proxypay/img/logo.svg' } },
],
```

The browser resolution order is:
1. Picks `image/svg+xml` if it supports SVG icons (Chrome 80+, Firefox 41+).
2. Falls back to `image/png` sized `32x32` or `16x16` for everything else.
3. Uses `image/x-icon` as the universal last resort (IE, old Android).
4. Uses `apple-touch-icon` when triggered by iOS/macOS bookmark actions.

---

## How to verify

### Dev server (visual check)
```bash
npm start
# Open http://localhost:3001 in:
#   Chrome  → should see the green ₿ icon in the tab
#   Safari  → should see the green ₿ icon in the tab
#   Firefox → should see the green ₿ icon in the tab
# Bookmark the page → icon should appear in bookmarks bar
```

### Check `<head>` tags
Open DevTools → Elements → `<head>`. You should see all five `<link>` tags:
```html
<link rel="icon" type="image/x-icon"  href="/proxypay/img/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/proxypay/img/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/proxypay/img/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/proxypay/img/apple-touch-icon.png">
<link rel="icon" type="image/svg+xml" href="/proxypay/img/logo.svg">
```

### No 404s
Open DevTools → Network → filter by `favicon` — all five requests should return
`200 OK` with appropriate `Content-Type` headers.

### All pages
Navigate between `/` and `/api` — the favicon should persist on both pages
(Docusaurus injects `headTags` globally, so this is guaranteed).

---

## Notes

- No new runtime dependencies.
- No changes to any React component or page layout.
- The pre-existing webpack `ProgressPlugin` build warning is unrelated to this PR
  (present on the base branch before these changes).
- Image files are small (< 800 bytes each) and committed directly to `static/img/`
  following the existing project convention for `logo.svg`.

---

closes #223
