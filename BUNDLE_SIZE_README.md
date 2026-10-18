# Bundle Size Analysis

## Overview

Bundle size monitoring has been added to prevent performance degradation. The build automatically fails if any bundle exceeds configured thresholds.

**Status**: ✅ Production Ready

## Quick Links

- **New to this?** → Start with [`BUNDLE_SIZE_QUICK_START.md`](./BUNDLE_SIZE_QUICK_START.md)
- **How to use?** → See [`BUNDLE_SIZE_ANALYSIS.md`](./BUNDLE_SIZE_ANALYSIS.md)
- **Technical details?** → Check [`BUNDLE_SIZE_IMPLEMENTATION.md`](./BUNDLE_SIZE_IMPLEMENTATION.md)
- **Verification?** → Review [`BUNDLE_SIZE_CHECKLIST.md`](./BUNDLE_SIZE_CHECKLIST.md)

## What Changed

### New Files
- `scripts/analyze-bundle-size.cjs` — The analyzer that checks sizes
- Documentation files (4 guides + this README)

### Modified Files
- `package.json` — Added `analyze:bundle-size` command

### Existing Integration
- GitHub Actions quality workflow already captures reports
- No breaking changes to existing build process

## The Thresholds

| What | Limit | Why |
|------|-------|-----|
| Main bundle | 250 KB | Docusaurus + app code |
| Vendor bundles | 300 KB | React, Redoc, dependencies |
| Total JS | 500 KB | All JS combined |
| Total CSS | 50 KB | All CSS combined |
| Per CSS file | 100 KB | Individual stylesheet |

*All sizes are gzipped (production metric)*

## Usage

### Run Build (Includes Check)
```bash
npm run build
```

### Check Existing Build
```bash
npm run analyze:bundle-size
```

### View Report
```bash
cat .quality-reports/bundle-size-report.json
```

## What Happens When Build Fails

1. **Console shows violations**:
   ```
   ❌ THRESHOLD VIOLATIONS:
     • Total JS size (813.84KB) exceeds threshold (500KB)
   ```

2. **Exit code is 1** (non-zero = failure)

3. **Build stops** — no deployment

4. **Report saved** to `.quality-reports/bundle-size-report.json`

5. **In CI/CD** — GitHub Actions detects failure and blocks merge

## How to Fix an Oversize Bundle

1. **Check what's big**:
   ```bash
   cat .quality-reports/bundle-size-report.json | jq '.bundles'
   ```

2. **Remove unused code**:
   - Audit dependencies: `npm ls --depth=0`
   - Remove unused packages
   - Use tree-shaking (ES modules only)

3. **Split code**:
   - Use React.lazy() for route-based splitting
   - Dynamic imports for conditional code

4. **Move to CDN**:
   - Large libraries can be externalized
   - Load via CDN instead of bundling

5. **Increase threshold** (last resort):
   - Edit `THRESHOLDS` in `scripts/analyze-bundle-size.cjs`
   - Document the reason in commit message
   - Ensure you have a plan to reduce size later

## Adjust Thresholds

Edit `scripts/analyze-bundle-size.cjs`:

```javascript
const THRESHOLDS = {
  'main': 250,        // ← Change here
  'vendors': 300,
  'css': 100,
  'total_js': 500,
  'total_css': 50,
};
```

Then run: `npm run build`

## CI/CD Integration

The analyzer is automatically part of:

- ✅ **Local build** → `npm run build`
- ✅ **GitHub Actions** → `quality-gates.yml` workflow
- ✅ **Artifact capture** → Reports stored for 90 days
- ✅ **Build blocking** → Oversized bundles prevent merge

## Environment Variables

For custom setups:

```bash
BUILD_DIR=/custom/path npm run analyze:bundle-size
REPORT_DIR=/custom/reports npm run analyze:bundle-size
```

## Questions?

- How do I reduce bundle size? → See `BUNDLE_SIZE_ANALYSIS.md` section "Reducing Bundle Size"
- Why is my CSS file large? → `BUNDLE_SIZE_ANALYSIS.md` → "Interpreting Results"
- How do I debug issues? → `BUNDLE_SIZE_ANALYSIS.md` → "Troubleshooting"
- What exactly happens? → `BUNDLE_SIZE_IMPLEMENTATION.md`

## File Structure

```
proxypay-frontend/
├── scripts/
│   └── analyze-bundle-size.cjs          ← The analyzer
├── BUNDLE_SIZE_README.md                 ← This file
├── BUNDLE_SIZE_QUICK_START.md            ← 5-minute guide
├── BUNDLE_SIZE_ANALYSIS.md               ← Full documentation
├── BUNDLE_SIZE_IMPLEMENTATION.md         ← Technical details
├── BUNDLE_SIZE_CHECKLIST.md              ← Verification
└── .quality-reports/
    └── bundle-size-report.json          ← Generated report
```

---

**Implemented**: September 27, 2026 | **Status**: ✅ Ready for Use
