# Bundle Size Analysis

## Overview

Bundle size monitoring is automatically integrated into the build process. The analyzer:

- ✅ Measures gzipped bundle sizes (production metric)
- ✅ Compares against configured thresholds
- ✅ Fails the build if thresholds are exceeded
- ✅ Reports results to `.quality-reports/bundle-size-report.json`

## Running the Build

Bundle size analysis runs automatically as part of the build:

```bash
npm run build
```

Or analyze an already-built project:

```bash
npm run analyze:bundle-size
```

## Thresholds

The following gzipped size thresholds are enforced:

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| `main` | 250 KB | Primary bundle with Docusaurus + app code |
| `vendors` | 300 KB | Vendor dependencies (React, Redoc, etc.) |
| `css` | 100 KB | Individual CSS file limit |
| `total_js` | 500 KB | Total across all JS files |
| `total_css` | 50 KB | Total across all CSS files |

## Adjusting Thresholds

Edit thresholds in `scripts/analyze-bundle-size.cjs`:

```javascript
const THRESHOLDS = {
  'main': 250,        // Main bundle
  'vendors': 300,     // Vendor chunk
  'css': 100,         // Individual CSS
  'total_js': 500,    // All JS combined
  'total_css': 50,    // All CSS combined
};
```

## Report Output

When the build completes, a detailed report is generated at:

```
.quality-reports/bundle-size-report.json
```

### Report Structure

```json
{
  "timestamp": "2026-09-27T08:01:06.706Z",
  "thresholds": { /* configured limits */ },
  "bundles": {
    "js": [
      { "file": "js/main.js", "size_kb": 123.45 }
    ],
    "css": [
      { "file": "css/style.css", "size_kb": 12.34 }
    ]
  },
  "totals": {
    "js": 123.45,
    "css": 12.34,
    "all": 135.79
  },
  "exceeded": [
    /* violations, if any */
  ]
}
```

## Build Failure Behavior

If any bundle exceeds its threshold:

1. **CLI Output** displays violations in human-readable format:
   ```
   ❌ THRESHOLD VIOLATIONS:
     • Total JS size (813.84KB) exceeds threshold (500KB)
     • Main bundle js/main.js (304.48KB) exceeds threshold (250KB)
   ```

2. **Exit Code**: The build fails with exit code 1

3. **CI/CD**: GitHub Actions and other CI systems detect the failure and block merge/deploy

## Interpreting Results

### Example: Passed

```
📊 Totals (gzipped):
  JavaScript:  182.72KB / 500KB ✓
  CSS:         0.04KB / 50KB ✓
  Total:       182.76KB

✅ All bundles are within thresholds!
```

### Example: Failed

```
📊 Totals (gzipped):
  JavaScript:  813.84KB / 500KB ❌ EXCEEDED

❌ THRESHOLD VIOLATIONS:
  • Total JS size (813.84KB) exceeds threshold (500KB)
  • Main bundle js/main.js (304.48KB) exceeds threshold (250KB)
  • Vendors bundle js/vendors.js (509.36KB) exceeds threshold (300KB)
```

## Reducing Bundle Size

### Quick Wins

1. **Remove unused dependencies**: Check `package.json` for unused packages
   ```bash
   npm ls --depth=0
   ```

2. **Dynamic imports**: Use React.lazy() for route-based code splitting

3. **Tree-shaking**: Ensure ES modules are used (no CommonJS imports)

4. **External dependencies**: Move large libraries to CDN or lazy-load

### Debugging

To see individual file contributions:

```bash
npm run analyze:bundle-size | grep -E "js/|css/"
```

To inspect the full report:

```bash
cat .quality-reports/bundle-size-report.json | jq '.bundles.js[] | select(.size_kb > 100)'
```

## Integration with CI/CD

The analyzer is automatically run in:

- **Local builds**: `npm run build`
- **GitHub Actions**: Quality workflow includes bundle size check
- **Deployments**: `npm run deploy` fails if thresholds exceeded

This prevents regressions from reaching production.

## Environment Variables

Override paths for custom builds:

```bash
BUILD_DIR=/custom/build npm run analyze:bundle-size
REPORT_DIR=/custom/reports npm run analyze:bundle-size
```

## Troubleshooting

### "Build directory not found"

Ensure you've run `npm run build` first, or explicitly set `BUILD_DIR`:

```bash
BUILD_DIR=/path/to/build npm run analyze:bundle-size
```

### Threshold too strict?

Legitimate growth is okay. Update thresholds in the script and document the change in a commit message explaining the reason.

### False positives?

The analyzer measures gzipped size, which differs from uncompressed. Large repetitive content (JSON, YAML) compresses well and may show lower gzipped sizes than expected.
