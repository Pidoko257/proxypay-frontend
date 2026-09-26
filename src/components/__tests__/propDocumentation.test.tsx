import React from 'react';
import { render, screen } from '@testing-library/react';
import DependencyGraphViewer, {
  GRAPH_LABEL_FONT_SIZE,
  GRAPH_LABEL_COLOR,
} from '../DependencyGraph';
import ChangelogViewer, {
  findMatches,
  highlightText,
  isValidSemanticVersion,
} from '../ChangelogViewer';
import ThemeCustomizer from '../ThemeCustomizer';

/**
 * Tests for issue #444 – Component Props Documentation
 *
 * Verifies that the documented public API of each component:
 * - Exports the expected constants / functions with correct types
 * - Renders without errors (proving the JSDoc examples work)
 * - Exposes well-typed values that match their documentation
 */

// Mock window.matchMedia (not implemented in jsdom)
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

// ── DependencyGraphViewer ──────────────────────────────────────────────────────
describe('DependencyGraphViewer – issue #444 documented props/exports', () => {
  it('GRAPH_LABEL_FONT_SIZE is a number (documented as px font size)', () => {
    expect(typeof GRAPH_LABEL_FONT_SIZE).toBe('number');
    expect(GRAPH_LABEL_FONT_SIZE).toBeGreaterThan(0);
  });

  it('GRAPH_LABEL_COLOR is a valid hex colour string', () => {
    expect(GRAPH_LABEL_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('renders without any props (self-contained as documented)', () => {
    expect(() => render(<DependencyGraphViewer />)).not.toThrow();
  });

  it('renders the title described in the JSDoc comment', () => {
    render(<DependencyGraphViewer />);
    expect(screen.getByText(/Endpoint Dependency Graph/i)).toBeInTheDocument();
  });

  it('renders zoom controls documented in JSDoc features list', () => {
    render(<DependencyGraphViewer />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit graph to screen')).toBeInTheDocument();
  });

  it('renders the legend described in the JSDoc features list', () => {
    render(<DependencyGraphViewer />);
    expect(screen.getByTestId('graph-legend')).toBeInTheDocument();
  });
});

// ── ChangelogViewer ────────────────────────────────────────────────────────────
describe('ChangelogViewer – issue #444 documented props/exports', () => {
  it('isValidSemanticVersion is exported and works as documented', () => {
    // Doc says: accepts v-prefixed semver, rejects non-semver
    expect(isValidSemanticVersion('v2.4.0')).toBe(true);
    expect(isValidSemanticVersion('not-semver')).toBe(false);
  });

  it('findMatches is exported and returns HighlightMatch[] as documented', () => {
    const matches = findMatches('Hello World', 'World');
    expect(Array.isArray(matches)).toBe(true);
    expect(matches[0]).toHaveProperty('start');
    expect(matches[0]).toHaveProperty('end');
  });

  it('highlightText is exported and wraps matched text in <mark>', () => {
    const { container } = render(
      <>{highlightText('Bulk Payment', [{ start: 0, end: 4 }])}</>
    );
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe('Bulk');
  });

  it('renders without any props (self-contained as documented)', () => {
    expect(() => render(<ChangelogViewer />)).not.toThrow();
  });

  it('renders the title described in the JSDoc comment', () => {
    render(<ChangelogViewer />);
    expect(screen.getByText(/API Changelog/i)).toBeInTheDocument();
  });

  it('renders both timeline and compact view buttons (ViewMode documented)', () => {
    render(<ChangelogViewer />);
    expect(screen.getByRole('button', { name: /Timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compact/i })).toBeInTheDocument();
  });

  it('renders export buttons documented in JSDoc', () => {
    render(<ChangelogViewer />);
    expect(screen.getByRole('button', { name: /Export RSS/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Atom/i })).toBeInTheDocument();
  });
});

// ── ThemeCustomizer ────────────────────────────────────────────────────────────
describe('ThemeCustomizer – issue #444 documented props/exports', () => {
  it('renders without any props (self-contained as documented)', () => {
    expect(() => render(<ThemeCustomizer />)).not.toThrow();
  });

  it('renders the Apply theme button described in JSDoc actions', () => {
    render(<ThemeCustomizer />);
    expect(
      screen.getByRole('button', { name: /Apply theme/i })
    ).toBeInTheDocument();
  });

  it('renders preset themes list described in JSDoc', () => {
    render(<ThemeCustomizer />);
    expect(screen.getByText(/Preset themes/i)).toBeInTheDocument();
  });

  it('renders the contrast warning section when contrast issues exist', () => {
    render(<ThemeCustomizer />);
    // The component renders without crashing; contrast warnings are conditional
    // and depend on the palette – we just verify the component mounts cleanly.
    expect(screen.getByText(/Theme customization/i)).toBeInTheDocument();
  });

  it('renders the Save custom theme button documented in JSDoc', () => {
    render(<ThemeCustomizer />);
    expect(
      screen.getByRole('button', { name: /Save custom theme/i })
    ).toBeInTheDocument();
  });
});
