import React, { lazy, Suspense } from 'react';

// Lazy load RedocStandalone to prevent heavy bundle size on initial loads
const LazyRedocStandalone = lazy(() =>
  import('redoc').then(module => ({ default: module.RedocStandalone }))
);

function RedocSkeleton() {
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: '#fff' }}>
      {/* Sidebar Skeleton */}
      <div style={{
        width: '260px',
        borderRight: '1px solid #e5e7eb',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
        backgroundColor: '#fafafa',
      }}>
        <div style={{ height: '32px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '2rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ height: '20px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '1.25rem', width: i % 2 === 0 ? '80%' : '60%', animation: 'pulse 1.5s infinite ease-in-out' }} />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div style={{ flex: 1, display: 'flex', boxSizing: 'border-box' }}>
        {/* Left main content */}
        <div style={{ flex: 1.2, padding: '3rem 2.5rem', boxSizing: 'border-box' }}>
          <div style={{ height: '48px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '40%', marginBottom: '1.5rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '20px', backgroundColor: '#f3f4f6', borderRadius: '4px', width: '90%', marginBottom: '2.5rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          
          <div style={{ height: '32px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '25%', marginBottom: '1rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: '16px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '0.75rem', width: '95%', animation: 'pulse 1.5s infinite ease-in-out' }} />
          ))}
        </div>

        {/* Right sample code panel */}
        <div style={{ flex: 0.8, backgroundColor: '#1f2937', padding: '3rem 2rem', boxSizing: 'border-box' }}>
          <div style={{ height: '24px', backgroundColor: '#374151', borderRadius: '4px', width: '30%', marginBottom: '1.5rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '180px', backgroundColor: '#111827', borderRadius: '8px', marginBottom: '2rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '24px', backgroundColor: '#374151', borderRadius: '4px', width: '40%', marginBottom: '1.5rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '120px', backgroundColor: '#111827', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
      </div>
    </div>
  );
}

export default function ApiReference(): React.JSX.Element {
  // Map Redoc styling configuration dynamically to CSS custom variables (defined in custom.css)
  const theme = {
    spacing: {
      unit: 5,
      sectionHorizontal: 40,
      sectionVertical: 40,
    },
    breakpoints: {
      small: '50rem',
      medium: '75rem',
      large: '105rem',
    },
    colors: {
      primary: {
        main: 'var(--redoc-color-primary, #2e8555)',
        light: 'var(--redoc-color-primary-light, #33925e)',
      },
      success: {
        main: 'var(--redoc-color-success, #10b981)',
      },
      warning: {
        main: 'var(--redoc-color-warning, #f59e0b)',
      },
      error: {
        main: 'var(--redoc-color-error, #ef4444)',
      },
      text: {
        primary: 'var(--redoc-color-text-primary, #1f2937)',
        secondary: 'var(--redoc-color-text-secondary, #4b5563)',
      },
      border: {
        dark: 'var(--redoc-color-border-dark, #d1d5db)',
        light: 'var(--redoc-color-border-light, #e5e7eb)',
      },
      responses: {
        success: {
          color: 'var(--redoc-color-success, #10b981)',
          backgroundColor: 'var(--redoc-color-success-bg, rgba(16, 185, 129, 0.05))',
        },
        error: {
          color: 'var(--redoc-color-error, #ef4444)',
          backgroundColor: 'var(--redoc-color-error-bg, rgba(239, 68, 68, 0.05))',
        },
      },
      http: {
        get: 'var(--redoc-color-get, #0ea5e9)',
        post: 'var(--redoc-color-post, #10b981)',
        put: 'var(--redoc-color-put, #f59e0b)',
        delete: 'var(--redoc-color-delete, #ef4444)',
      },
    },
    typography: {
      fontSize: 'var(--redoc-font-size, 14px)',
      lineHeight: 'var(--redoc-line-height, 1.5)',
      fontFamily: 'var(--redoc-font-family, var(--ifm-font-family-base, system-ui, -apple-system, sans-serif))',
      headings: {
        fontFamily: 'var(--redoc-headings-font-family, var(--ifm-font-family-base, system-ui, -apple-system, sans-serif))',
        fontWeight: 'var(--redoc-headings-font-weight, 600)',
      },
      code: {
        fontFamily: 'var(--redoc-code-font-family, var(--ifm-font-family-monospace, monospace))',
        fontSize: 'var(--redoc-code-font-size, 13px)',
      },
    },
    sidebar: {
      width: 'var(--redoc-sidebar-width, 260px)',
      backgroundColor: 'var(--redoc-sidebar-bg, #fafafa)',
      textColor: 'var(--redoc-sidebar-text, #1f2937)',
      activeTextColor: 'var(--redoc-sidebar-active-text, #2e8555)',
    },
    rightPanel: {
      backgroundColor: 'var(--redoc-right-panel-bg, #1f2937)',
      width: 'var(--redoc-right-panel-width, 40%)',
      textColor: 'var(--redoc-right-panel-text, #ffffff)',
    },
  };

  return (
    <Suspense fallback={<RedocSkeleton />}>
      <LazyRedocStandalone
        specUrl="/openapi.yaml"
        options={{
          hideHostname: false,
          disableSearch: false,
          expandResponses: '200,201',
          requiredPropsFirst: true,
          sortPropsAlphabetically: true,
          theme: theme,
        }}
      />
    </Suspense>
  );
}
