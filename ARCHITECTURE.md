# ProxyPay API Reference - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Docusaurus Site                          │
│  (Layout with Navbar, Footer, Theme Integration)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────── /api Page ─────────────────────┐ │
│  │           (src/pages/api.tsx)                          │ │
│  │   BrowserOnly wrapper → IntegratedApiReference         │ │
│  └──────────────────────────────────────────────────────┬─┘ │
│                                                         │    │
│  ┌──────────────────────────────────────────────────────▼──┐ │
│  │     IntegratedApiReference (Main Component)         │ │
│  │  ┌─────────────────────────────────────────────┐    │ │
│  │  │ Search Bar                                  │    │ │
│  │  │ - Real-time filtering                       │    │ │
│  │  │ - Endpoint count display                    │    │ │
│  │  └─────────────────────────────────────────────┘    │ │
│  │           ▼                                         │ │
│  │  ┌─────────────────────────────────────────────┐    │ │
│  │  │ Layout Container (Flex)                     │    │ │
│  │  │                                             │    │ │
│  │  │ ┌──────────────┐  ┌────────────────────┐   │    │ │
│  │  │ │   Sidebar    │  │  Redoc Viewer      │   │    │ │
│  │  │ │              │  │                    │   │    │ │
│  │  │ │ APISidebarNav│  │  RedocViewer       │   │    │ │
│  │  │ │              │  │                    │   │    │ │
│  │  │ │ - Tag Groups │  │ - OpenAPI Spec    │   │    │ │
│  │  │ │ - Endpoints  │  │ - Full Docs       │   │    │ │
│  │  │ │ - Selection  │  │ - Examples        │   │    │ │
│  │  │ │ - Deep-link  │  │ - Try-it-out      │   │    │ │
│  │  │ │   sync       │  │                    │   │    │ │
│  │  │ └──────────────┘  └────────────────────┘   │    │ │
│  │  │                   ▲                       │    │ │
│  │  │                   │ Deep-link             │    │ │
│  │  │                   │ Navigation            │    │ │
│  │  │                   │ (via URL hash)        │    │ │
│  │  └───────────────────┼───────────────────────┘    │ │
│  │                      │                            │ │
│  └──────────────────────┼────────────────────────────┘ │
│                         │                             │
│  ┌──────────────────────▼────────────────────────┐    │
│  │  Utility Libraries                           │    │
│  │                                              │    │
│  │  ┌────────────────────┐  ┌────────────────┐  │    │
│  │  │ apiSpecParser      │  │ redocDeepLink  │  │    │
│  │  │                    │  │                │  │    │
│  │  │ - parseEndpoints   │  │ - parseDeepLink│  │    │
│  │  │ - groupByTag       │  │ - generateDL   │  │    │
│  │  │ - searchEndpoints  │  │ - toEndpoint   │  │    │
│  │  │ - extract*         │  │ - toTag        │  │    │
│  │  │ - generate*        │  │ - onHashChange │  │    │
│  │  │                    │  │ - updateHistory│  │    │
│  │  │                    │  │ - scrollIntoView  │    │
│  │  └────────────────────┘  └────────────────┘  │    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Data Sources                               │   │
│  │  - static/openapi.yaml (YAML format)        │   │
│  │  - Remote URL (JSON or YAML)                │   │
│  │  - Direct spec object                       │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
IntegratedApiReference (Container)
├── Search Bar
├── Layout
│   ├── APISidebarNav (Sidebar)
│   │   ├── Header
│   │   └── Tag Groups
│   │       ├── Tag Header (collapsible)
│   │       └── Endpoints List
│   │           ├── Endpoint Item (method + path)
│   │           └── ...
│   │
│   └── RedocViewer (Main Content)
│       └── Redoc Standalone
│           ├── API Documentation
│           ├── Try-it-out panel
│           └── Right panel examples
```

## Data Flow

### 1. Specification Loading

```
OpenAPI Spec (YAML/JSON)
  ↓
Fetch / Direct Object
  ↓
Parse with js-yaml or JSON.parse
  ↓
Validate OpenAPI 3.0 structure
  ↓
Pass to RedocViewer + apiSpecParser
```

### 2. Endpoint Extraction

```
OpenAPI Spec
  ↓
parseEndpoints() → Extract paths, methods, metadata
  ↓
ParsedEndpoint[] (array of structured endpoints)
  ↓
groupByTag() → Group by primary tag
  ↓
TagGroup[] (organized by categories)
  ↓
Used by: Sidebar Navigation, Search, Display
```

### 3. Search Flow

```
User input (search query)
  ↓
Debounce (300ms)
  ↓
filterEndpointsBySearch()
  ↓
Filter by: path, method, summary, description, tags
  ↓
Filtered endpoints[]
  ↓
Display in sidebar, update count
```

### 4. Navigation & Deep-Linking

```
User clicks endpoint/tag in sidebar
  ↓
generateDeepLink() → Create hash
  ↓
Update window.location.hash
  ↓
URL: #/endpoint?id=<id> or #/tag/<tagName>
  ↓
onHashChange listener fires
  ↓
parseDeepLink() → Structured format
  ↓
Redoc handles endpoint navigation
  ↓
APISidebarNav updates selection
  ↓
scrollIntoView() → Smooth scroll
```

### 5. State Synchronization

```
User Action (click sidebar item)
  ↓
Update local state (selectedEndpointId)
  ↓
Update URL hash
  ↓
↓---------------------------------↓
│ Hash Change Detected            │
│ (onHashChange listener)         │
└────────────────────────────────┘
  ↓
Parse hash → Determine what to navigate
  ↓
Scroll Redoc to endpoint
  ↓
Highlight in sidebar
```

## File Organization

```
proxypay-frontend/
├── src/
│   ├── pages/
│   │   └── api.tsx (Entry point for /api route)
│   │
│   ├── components/
│   │   ├── IntegratedApiReference.tsx (Main orchestrator)
│   │   ├── RedocViewer.tsx (Redoc renderer)
│   │   ├── APISidebarNav.tsx (Sidebar navigation)
│   │   └── ApiReference.module.css (Layout styles)
│   │
│   ├── utils/
│   │   ├── apiSpecParser.ts (OpenAPI parsing)
│   │   ├── redocDeepLink.ts (Navigation utilities)
│   │   └── other utilities...
│   │
│   ├── css/
│   │   └── custom.css (Theme variables)
│   │
│   └── __tests__/
│       └── API tests (ready for implementation)
│
├── static/
│   └── openapi.yaml (OpenAPI specification)
│
├── API_REFERENCE_GUIDE.md (Full documentation)
├── QUICKSTART.md (Quick start guide)
├── IMPLEMENTATION_COMPLETE.md (Summary)
└── ARCHITECTURE.md (This file)
```

## Type System

```
OpenAPISpec (Root)
├── info: { title, version, description }
├── paths: Record<string, PathItem>
│   └── PathItem: Record<string, Operation>
│       └── Operation
│           ├── summary: string
│           ├── description?: string
│           ├── tags?: string[]
│           ├── operationId?: string
│           ├── parameters?: Parameter[]
│           ├── requestBody?: RequestBody
│           └── responses: Record<string, Response>
└── tags?: Tag[]
    └── Tag: { name, description }

ParsedEndpoint
├── id: string (unique identifier)
├── operationId?: string
├── method: string (http method)
├── path: string (api path)
├── summary: string
├── description?: string
├── tag?: string (primary tag)
├── tags?: string[] (all tags)
├── deprecated?: boolean
├── parameters?: Parameter[]
├── requestBody?: RequestBody
└── responses?: Record<string, Response>

TagGroup
├── name: string
├── description?: string
└── endpoints: ParsedEndpoint[]

DeepLink
├── type: 'endpoint' | 'tag' | 'schema' | 'response'
├── target: string (endpoint id, tag name, etc.)
├── subTarget?: string (optional)
└── query?: string (search query)
```

## Key Design Patterns

### 1. **Component Separation of Concerns**
- IntegratedApiReference: State & orchestration
- RedocViewer: Redoc rendering
- APISidebarNav: Navigation UI

### 2. **Utility-First Approach**
- Pure functions for parsing (apiSpecParser)
- Stateless navigation helpers (redocDeepLink)
- Composable utilities for reuse

### 3. **Hash-Based Navigation**
- URL hash for deep-linking without page reload
- Browser history integration
- Easily shareable links

### 4. **Memoization Strategy**
- useMemo for derived state (filtered endpoints, tag groups)
- useCallback for stable callbacks
- Prevents unnecessary re-renders

### 5. **Error Boundary Pattern**
- Try-catch in spec loading
- Error states displayed to user
- Graceful fallbacks for missing data

## Styling Architecture

### CSS Layers

```
1. Theme Variables (src/css/custom.css)
   └── --ifm-color-primary, --ifm-background-color, etc.

2. Component Styles (module.css files)
   ├── ApiReference.module.css (Main layout)
   ├── APISidebarNav.module.css (Sidebar)
   └── RedocViewer.module.css (Viewer)

3. Responsive Breakpoints
   ├── Desktop (> 1024px): Side-by-side
   ├── Tablet (768-1024px): Stacked, sidebar limited
   └── Mobile (< 768px): Stacked, sidebar even more limited

4. Dark Mode Support
   └── Uses CSS variables (automatic with Docusaurus)

5. Accessibility Enhancements
   ├── ARIA labels
   ├── High contrast mode support
   ├── Reduced motion support
   └── Keyboard navigation
```

## Performance Considerations

### Optimization Techniques

1. **Lazy Loading**
   - Redoc CDN script loads only when component mounts
   - BrowserOnly wrapper prevents SSR issues

2. **Memoization**
   - parseEndpoints() result cached via useMemo
   - groupByTag() result cached
   - Search filtering memoized

3. **Event Delegation**
   - Single hash change listener for all navigation
   - DeepLinkObserver class manages subscriptions

4. **Search Debouncing**
   - 300ms debounce prevents excessive filtering

5. **CSS Modules**
   - Scoped styles prevent naming conflicts
   - Smaller bundle with no global CSS pollution

## Integration Points

### With Docusaurus

- Uses Layout component for navbar/footer
- Integrates with theme config
- Uses CSS variables from theme
- Respects baseUrl configuration
- Works with deployment settings

### With Backend

- Loads OpenAPI spec from static files or remote URL
- Supports YAML or JSON formats
- No backend API calls required (spec is static)
- Can be updated without code changes

### With Other Features

- Can coexist with other pages
- Search utilities can be reused
- Deep-link system extensible
- Sidebar component standalone-usable

## Future Extensibility

### Planned Enhancements

1. **Multi-Version Support**
   - Version selector
   - Multiple spec files

2. **Try-It-Out Enhancement**
   - Custom auth headers
   - Request history

3. **Full-Text Search**
   - Fuzzy matching
   - Result highlighting

4. **Visualization**
   - Schema relationship diagrams
   - Endpoint dependency graph

5. **Export Features**
   - Postman collection export
   - PDF documentation generation

---

**Architecture Version**: 1.0.0  
**Last Updated**: July 29, 2026  
**Status**: Production Ready
