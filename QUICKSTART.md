# Quick Start: ProxyPay API Reference

## 1. Place Your OpenAPI Spec

Put your OpenAPI 3.0 specification at `static/openapi.yaml`:

```bash
# From backend
cp ../proxypay/openapi.yaml ./static/openapi.yaml

# Or from running backend
curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml
```

## 2. Start the Dev Server

```bash
npm start
```

Visit: http://localhost:3001/api

## 3. Features You Get

✅ **Redoc Viewer** - Full interactive OpenAPI documentation  
✅ **Sidebar Navigation** - Endpoints grouped by tags  
✅ **Search** - Filter endpoints by path, method, description, tags  
✅ **Deep-Linking** - Share links to specific endpoints  
✅ **Responsive** - Works on desktop, tablet, and mobile  
✅ **Dark Mode** - Automatic theme integration  

## 4. Navigation Examples

**Sidebar:**
- Click tag names to expand/collapse
- Click endpoint to highlight in Redoc
- Type in search bar to filter

**Deep-Linking:**
```
/api#/endpoint?id=get:/users              → Navigate to GET /users
/api#/tag/Users                           → Open Users tag
/api#/endpoint?id=post:/users&query=create → Search & navigate
```

## 5. Customization

### Change Sidebar Width
Edit `src/components/ApiReference.module.css`:
```css
.sidebar {
  width: 300px;  /* Change this */
}
```

### Change Colors
Edit `src/css/custom.css`:
```css
:root {
  --ifm-color-primary: #2e8555;  /* Change primary color */
}
```

### Disable Sidebar
In `src/pages/api.tsx`:
```tsx
<IntegratedApiReference
  showSidebar={false}  // Hide sidebar
/>
```

## 6. File Structure

```
src/
├── pages/
│   └── api.tsx                          # Main API page
├── components/
│   ├── IntegratedApiReference.tsx       # Main component
│   ├── RedocViewer.tsx                  # Redoc viewer
│   ├── APISidebarNav.tsx                # Sidebar navigation
│   └── ApiReference.module.css          # Styles
├── utils/
│   ├── apiSpecParser.ts                 # OpenAPI parser
│   └── redocDeepLink.ts                 # Deep-linking utils
└── css/
    └── custom.css                       # Theme variables

static/
└── openapi.yaml                         # Your OpenAPI spec
```

## 7. Common Tasks

### Add Search to Another Page
```tsx
import { searchEndpoints } from '@/utils/apiSpecParser';

const results = searchEndpoints(endpoints, 'users');
```

### Navigate Programmatically
```tsx
import { toEndpointLink, toTagLink } from '@/utils/redocDeepLink';

// Go to endpoint
window.location.hash = toEndpointLink('get:/users');

// Go to tag
window.location.hash = toTagLink('Users');
```

### Parse OpenAPI Spec
```tsx
import { parseEndpoints, groupByTag } from '@/utils/apiSpecParser';
import jsYaml from 'js-yaml';

const spec = jsYaml.load(yamlContent);
const endpoints = parseEndpoints(spec);
const groups = groupByTag(endpoints);
```

## 8. Troubleshooting

**Spec not loading?**
- Check `static/openapi.yaml` exists
- Verify it's valid YAML: `cat static/openapi.yaml`
- Check browser console (F12) for errors

**Sidebar empty?**
- Your spec might have no endpoints
- Verify spec has `paths:` section
- Check endpoints have `tags:` property

**Deep-links not working?**
- Format: `#/endpoint?id=<method>:<path>`
- Example: `#/endpoint?id=get:/users`
- Check browser console for errors

**Styling looks off?**
- Clear browser cache (Ctrl+Shift+Delete)
- Check CSS variables in `src/css/custom.css`
- Test in incognito mode

## 9. Build for Production

```bash
# Build
npm run build

# Test build locally
npm run serve

# Deploy to GitHub Pages
npm run deploy
```

## 10. Full Documentation

See `API_REFERENCE_GUIDE.md` for:
- Detailed component APIs
- Advanced customization
- Theme configuration
- Performance tuning
- Troubleshooting guide

---

**Next Steps:**
1. Place your OpenAPI spec at `static/openapi.yaml`
2. Run `npm start`
3. Visit `/api` to see it in action
4. Read `API_REFERENCE_GUIDE.md` for advanced features

**Questions?** Check component JSDoc comments or review the guide.
