# API Reference Implementation Guide

## Overview

The ProxyPay API Reference page is a fully interactive documentation portal powered by **Redoc** with deep-linking support, sidebar navigation, and search capabilities. The implementation combines a modern OpenAPI 3.0 viewer with an integrated sidebar showing the API tag structure for better navigation.

## Architecture

### Components

#### 1. **IntegratedApiReference** (`src/components/IntegratedApiReference.tsx`)
Main component that orchestrates the API reference experience.

**Features:**
- Displays Redoc viewer with Docusaurus Layout integration
- Renders sidebar navigation with endpoint grouping
- Handles search filtering and deep-linking
- Syncs sidebar state with URL hash

**Props:**
```typescript
interface IntegratedApiReferenceProps {
  specUrl?: string;              // OpenAPI spec file URL (default: /openapi.yaml)
  spec?: OpenAPISpec;            // Direct spec object (optional)
  title?: string;                // Page title
  showSidebar?: boolean;         // Show/hide sidebar (default: true)
  enableDeepLinking?: boolean;   // Enable URL hash navigation (default: true)
  expandTagsByDefault?: boolean; // Expand all tags initially (default: true)
  onSpecLoaded?: (spec: OpenAPISpec) => void;
  onError?: (error: Error) => void;
}
```

#### 2. **RedocViewer** (`src/components/RedocViewer.tsx`)
Renders the Redoc standalone instance.

**Features:**
- Loads OpenAPI spec from URL or uses provided spec
- Handles both JSON and YAML formats
- Supports deep-linking via URL hash
- Theme integration with Docusaurus variables

**Props:**
```typescript
interface RedocViewerProps {
  specUrl?: string;
  spec?: OpenAPISpec;
  title?: string;
  hideHostname?: boolean;
  disableSidebar?: boolean;
  expandTagsByDefault?: boolean;
  enableDeepLinking?: boolean;
  onSpecLoaded?: (spec: OpenAPISpec) => void;
  onError?: (error: Error) => void;
  onDeepLinkNavigate?: (elementId: string) => void;
}
```

#### 3. **APISidebarNav** (`src/components/APISidebarNav.tsx`)
Sidebar component showing API tags and endpoints.

**Features:**
- Groups endpoints by OpenAPI tags
- Expandable/collapsible tag sections
- Visual HTTP method badges with color coding
- Deep-link synchronized selection
- Search result filtering support

**Props:**
```typescript
interface APISidebarNavProps {
  endpoints: ParsedEndpoint[];
  tagGroups?: TagGroup[];
  onEndpointClick?: (endpoint: ParsedEndpoint) => void;
  onTagClick?: (tagName: string) => void;
  selectedEndpointId?: string;
  expandedTags?: string[];
  onTagToggle?: (tag: string) => void;
  enableDeepLinking?: boolean;
}
```

### Utilities

#### 1. **apiSpecParser.ts** (`src/utils/apiSpecParser.ts`)
Parses OpenAPI 3.0 specifications and extracts structured data.

**Key Functions:**
- `parseEndpoints(spec)` - Extract all endpoints from spec
- `groupByTag(endpoints)` - Group endpoints by OpenAPI tags
- `searchEndpoints(endpoints, query)` - Filter endpoints by search query
- `extractTagDescriptions(spec)` - Get tag descriptions
- `extractUniqueTags(endpoints)` - Get unique tag list
- `generateEndpointId(method, path)` - Create URL-safe IDs
- `extractBasePath(spec)` - Get base path from servers config

**Types:**
```typescript
interface ParsedEndpoint {
  id: string;              // Unique identifier
  operationId?: string;    // OpenAPI operationId
  method: string;          // HTTP method (get, post, etc.)
  path: string;            // API path
  summary: string;         // Short description
  description?: string;    // Full description
  tag?: string;            // Primary tag
  tags?: string[];         // All tags
  deprecated?: boolean;    // Deprecation status
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

interface TagGroup {
  name: string;
  description?: string;
  endpoints: ParsedEndpoint[];
}
```

#### 2. **redocDeepLink.ts** (`src/utils/redocDeepLink.ts`)
Manages URL hash-based navigation and deep-linking.

**Key Functions:**
- `parseDeepLink(hash)` - Parse URL hash into structured deep-link
- `generateDeepLink(deepLink)` - Generate URL hash from deep-link
- `toEndpointLink(endpointId, query?)` - Create endpoint link
- `toTagLink(tagName, query?)` - Create tag link
- `onHashChange(callback)` - Listen for hash changes
- `updateHistory(deepLink)` - Update browser history
- `scrollIntoView(element, options)` - Smooth scroll to element
- `DeepLinkObserver` class - Centralized hash change observer

**Deep-Link Format:**
```
#/endpoint?id=<id>              // Navigate to endpoint
#/tag/<tagName>                 // Navigate to tag
#/schema/<schemaName>           // Navigate to schema
#/response/<endpointId>/<code>  // Navigate to response

// With query parameter
#/endpoint?id=<id>&query=search
#/tag/<tagName>?query=search
```

## Usage

### Basic Setup

The API page is automatically configured and accessible at `/api` in your Docusaurus site. The implementation is already integrated in:

- **Page:** `src/pages/api.tsx`
- **Default spec location:** `static/openapi.yaml`

### Loading OpenAPI Specification

#### Option 1: YAML File (Default)
Place your OpenAPI spec at `static/openapi.yaml`:

```bash
# From backend repository
cp ../proxypay/openapi.yaml ./static/openapi.yaml

# Or from running backend
curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml
```

#### Option 2: Remote URL
Pass a custom `specUrl` to `IntegratedApiReference`:

```tsx
<IntegratedApiReference
  specUrl="https://api.example.com/openapi.yaml"
  title="External API Reference"
/>
```

#### Option 3: Direct Spec Object
Pass a spec object directly:

```tsx
import mySpec from './my-spec.json';

<IntegratedApiReference
  spec={mySpec}
  title="Inline API Reference"
/>
```

### Deep-Linking

Users can navigate directly to specific endpoints or tags using URL hashes:

```
/api#/endpoint?id=get:/users                  // Go to GET /users
/api#/tag/Users                               // Expand Users tag
/api#/endpoint?id=post:/users&query=create    // Go to endpoint with search
```

**Programmatic navigation:**

```tsx
import { toEndpointLink, toTagLink } from '@/utils/redocDeepLink';

// Navigate to endpoint
window.location.hash = toEndpointLink('get:/users');

// Navigate to tag
window.location.hash = toTagLink('Users');
```

### Customization

#### Disable Sidebar

```tsx
<IntegratedApiReference
  showSidebar={false}
  enableDeepLinking={true}
/>
```

#### Disable Deep-Linking

```tsx
<IntegratedApiReference
  enableDeepLinking={false}
/>
```

#### Custom Styling

Edit `src/components/ApiReference.module.css` to customize:
- Sidebar width and colors
- Search bar styling
- Responsive breakpoints
- Theme integration

#### Custom Redoc Theme

In `RedocViewer` component, modify the theme options:

```tsx
RedocStandalone.init(
  loadedSpec,
  {
    theme: {
      colors: {
        primary: '#2e8555',
        error: '#f93e3e',
      },
      typography: {
        fontSize: '14px',
      },
      rightPanel: {
        backgroundColor: '#ffffff',
      },
    },
    // ... other options
  },
  containerRef.current
);
```

### Search Functionality

The sidebar includes a search bar that filters endpoints in real-time by:
- API path
- HTTP method
- Summary text
- Description text
- Tags
- operationId

The search results are displayed dynamically as the user types.

### Responsive Behavior

**Desktop (> 1024px):**
- Sidebar and Redoc side-by-side
- Full-height layout

**Tablet (768px - 1024px):**
- Sidebar stacked above Redoc
- Sidebar max-height: 40vh

**Mobile (< 768px):**
- Sidebar stacked above Redoc
- Sidebar max-height: 35vh
- Search bar stack vertically

## OpenAPI Specification Format

The implementation expects **OpenAPI 3.0** specifications. Required fields:

```yaml
openapi: 3.0.3
info:
  title: API Title
  version: 1.0.0
  description: Optional description

tags:  # Optional but recommended
  - name: Users
    description: User management endpoints
  - name: Products
    description: Product management endpoints

paths:
  /users:
    get:
      tags:
        - Users
      operationId: getUsers
      summary: List all users
      description: Returns a paginated list of users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema: { type: object }
    
    post:
      tags:
        - Users
      operationId: createUser
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object }
      responses:
        '201':
          description: User created
```

## API Sidebar Navigation Features

### Tag Grouping
Endpoints are automatically grouped by their primary OpenAPI tag. Tags appear alphabetically, with "Other" at the end.

### Method Badges
HTTP methods are color-coded:
- **GET** - Blue (#61affe)
- **POST** - Green (#49cc90)
- **PUT** - Orange (#fca130)
- **PATCH** - Orange (#fca130)
- **DELETE** - Red (#f93e3e)
- **OPTIONS/HEAD** - Purple (#9012fe)

### State Persistence
- Expanded tags are tracked in component state
- Deep-links sync sidebar state with URL hash
- Selected endpoint highlighted in sidebar

### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- High contrast mode support
- Reduced motion support

## Performance Optimizations

1. **Lazy loading**: Redoc loads from CDN only when needed
2. **Memoization**: `useMemo` prevents unnecessary re-renders of endpoint lists
3. **Debounced search**: Search input is debounced to reduce filtering operations
4. **Efficient filtering**: Direct array operations without unnecessary state updates
5. **CSS modules**: Scoped styles prevent naming conflicts

## Troubleshooting

### Spec not loading
1. Check `static/openapi.yaml` exists and is valid YAML
2. Verify spec has `openapi: 3.0.3` declaration
3. Check browser console for network errors
4. Verify content-type header is correct (application/yaml or application/json)

### Deep-linking not working
1. Ensure `enableDeepLinking={true}` is set
2. Check endpoint ID format matches `method:path` or operationId
3. Verify hash syntax: `#/endpoint?id=<id>`
4. Clear browser cache and local storage

### Sidebar not expanding
1. Check endpoint parsing - run `parseEndpoints()` in console
2. Verify endpoints have `tag` property set
3. Check CSS not hiding sidebar (display: none)

### Styling issues
- Verify Docusaurus CSS variables are defined
- Check `src/css/custom.css` for theme conflicts
- Use browser DevTools to inspect computed styles
- Test in light and dark mode

## Development

### Building locally
```bash
npm install
npm start        # Dev server on http://localhost:3001
npm run build    # Production build
npm run serve    # Serve production build
```

### Adding new utilities
1. Create new files in `src/utils/`
2. Export types and functions
3. Import in components as needed
4. Add tests in `src/__tests__/`

### Testing changes
1. Update `static/openapi.yaml` with sample endpoints
2. Run `npm start` to test locally
3. Check sidebar navigation and deep-linking
4. Test mobile responsiveness
5. Verify search functionality

## Future Enhancements

Potential improvements:
- [ ] Multi-version API specification support
- [ ] API playground with try-it-out functionality
- [ ] Full-text search with fuzzy matching
- [ ] Custom domain models visualization
- [ ] Authentication header configuration
- [ ] Request/response examples gallery
- [ ] OpenAPI diff/changelog viewer
- [ ] Export as Postman collection
- [ ] Integrated API changelog

## Related Files

- Main page: `src/pages/api.tsx`
- Components: `src/components/{IntegratedApiReference,RedocViewer,APISidebarNav}.tsx`
- Styles: `src/components/ApiReference.module.css` and `RedocViewer.module.css`
- Utilities: `src/utils/{apiSpecParser,redocDeepLink}.ts`
- Spec: `static/openapi.yaml`
- Config: `docusaurus.config.ts`

## Support

For issues or questions about the API reference implementation:
1. Check this documentation
2. Review component JSDoc comments
3. Inspect browser console for errors
4. Check network tab for spec loading issues
5. Open an issue in the GitHub repository
