# Bundle Size Analysis - Quick Start

## TL;DR

Bundle size is automatically checked during builds. Large bundles will fail the build.

```bash
npm run build  # Includes bundle size check
```

## Common Scenarios

### ✅ Build Passes
```
📊 Totals (gzipped):
  JavaScript:  182.72KB / 500KB ✓
  CSS:         0.04KB / 50KB ✓

✅ All bundles are within thresholds!
```

### ❌ Build Fails
```
❌ THRESHOLD VIOLATIONS:
  • Total JS size (813.84KB) exceeds threshold (500KB)
```

**Solution**: Reduce bundle size or increase thresholds (with justification)

## Thresholds

| Bundle | Limit |
|--------|-------|
| Main JS | 250 KB |
| Vendor JS | 300 KB |
| Total JS | 500 KB |
| CSS | 50-100 KB |

## Check Bundle Size

```bash
npm run analyze:bundle-size
```

View detailed report:
```bash
cat .quality-reports/bundle-size-report.json | jq
```

## Reduce Bundle Size

1. **Remove unused packages** — `npm ls --depth=0`
2. **Use dynamic imports** — `React.lazy()` for routes
3. **External CDN** — Move large libraries outside
4. **Check reports** — See which files are largest
5. **Tree-shake** — Ensure using ES modules

## More Info

- Full guide: `BUNDLE_SIZE_ANALYSIS.md`
- Implementation: `BUNDLE_SIZE_IMPLEMENTATION.md`
- Checklist: `BUNDLE_SIZE_CHECKLIST.md`
