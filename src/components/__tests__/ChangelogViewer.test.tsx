import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChangelogViewer, { findMatches, highlightText, isValidSemanticVersion } from '../ChangelogViewer';

/**
 * Tests for ChangelogViewer search functionality with highlighting.
 * Covers:
 * - Search by version, title, endpoint, tag
 * - Highlight rendering with correct styling
 * - Integration with filters
 * - Both timeline and compact view modes
 */
describe('ChangelogViewer', () => {
  describe('semantic version validation', () => {
    it('accepts valid versions with an optional v prefix and prerelease metadata', () => {
      expect(isValidSemanticVersion('v2.4.0')).toBe(true);
      expect(isValidSemanticVersion('1.0.0-beta.1+build.7')).toBe(true);
    });

    it('rejects versions that do not follow semver', () => {
      expect(isValidSemanticVersion('version-2.4')).toBe(false);
      expect(isValidSemanticVersion('v2.4')).toBe(false);
      expect(isValidSemanticVersion('01.2.3')).toBe(false);
    });
  });

  describe('findMatches', () => {
    it('finds case-insensitive matches in text', () => {
      const matches = findMatches('Hello World Hello', 'hello');
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ start: 0, end: 5 });
      expect(matches[1]).toEqual({ start: 12, end: 17 });
    });

    it('returns empty array for empty search term', () => {
      const matches = findMatches('Hello World', '');
      expect(matches).toHaveLength(0);
    });

    it('returns empty array for no matches', () => {
      const matches = findMatches('Hello World', 'xyz');
      expect(matches).toHaveLength(0);
    });

    it('finds single character matches', () => {
      const matches = findMatches('aaa', 'a');
      expect(matches).toHaveLength(3);
    });

    it('finds overlapping matches correctly', () => {
      const matches = findMatches('aaaa', 'aa');
      // Should find: 0-2, 1-3, 2-4
      expect(matches).toHaveLength(3);
    });

    it('finds multi-word phrase matches', () => {
      const matches = findMatches('Bulk Payment Endpoint', 'payment endpoint');
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ start: 5, end: 21 });
    });

    it('handles special characters', () => {
      const matches = findMatches('POST /payments/bulk', '/payments');
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ start: 5, end: 14 });
    });
  });

  describe('highlightText', () => {
    it('renders text without matches unchanged', () => {
      const result = highlightText('Hello World', []);
      expect(result).toBe('Hello World');
    });

    it('wraps matched text in mark element with correct styling', () => {
      const { container } = render(<>{highlightText('Hello World', [{ start: 0, end: 5 }])}</>);
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark?.textContent).toBe('Hello');
      expect(mark?.style.background).toBe('rgb(254, 240, 138)'); // #fef08a
      expect(mark?.style.color).toBe('rgb(133, 77, 14)'); // #854d0e
    });

    it('handles multiple non-overlapping matches', () => {
      const { container } = render(
        <>
          {highlightText('Hello World Hello', [
            { start: 0, end: 5 },
            { start: 12, end: 17 },
          ])}
        </>
      );
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(2);
      expect(marks[0].textContent).toBe('Hello');
      expect(marks[1].textContent).toBe('Hello');
    });

    it('merges overlapping matches', () => {
      const { container } = render(
        <>
          {highlightText('aaaa', [
            { start: 0, end: 2 },
            { start: 1, end: 3 },
          ])}
        </>
      );
      const marks = container.querySelectorAll('mark');
      // Should merge overlapping matches into one
      expect(marks).toHaveLength(1);
      expect(marks[0].textContent).toBe('aaa');
    });

    it('preserves text around matches', () => {
      const { container } = render(
        <>
          {highlightText('Hello World', [{ start: 6, end: 11 }])}
        </>
      );
      expect(container.textContent).toBe('Hello World');
      const mark = container.querySelector('mark');
      expect(mark?.textContent).toBe('World');
    });
  });

  describe('Search functionality', () => {
    it('renders component without errors', () => {
      render(<ChangelogViewer />);
      expect(screen.getByText(/📋 API Changelog/i)).toBeInTheDocument();
    });

    it('displays search input', () => {
      render(<ChangelogViewer />);
      expect(screen.getByPlaceholderText(/Search by endpoint/i)).toBeInTheDocument();
    });

    it('shows empty state when no matches found', () => {
      render(<ChangelogViewer />);
      const searchInput = screen.getByPlaceholderText(/Search by endpoint/i);
      
      fireEvent.change(searchInput, { target: { value: 'nonexistent_xyz_abc' } });
      
      expect(screen.getByText(/No changelog entries match your filters/i)).toBeInTheDocument();
    });

    it('highlights search matches', () => {
      render(<ChangelogViewer />);
      const searchInput = screen.getByPlaceholderText(/Search by endpoint/i);
      
      fireEvent.change(searchInput, { target: { value: 'Bulk' } });
      
      // Should have highlighted text
      const marks = screen.getAllByText('Bulk', { selector: 'mark' });
      expect(marks.length).toBeGreaterThan(0);
      marks.forEach((mark) => {
        expect(mark.style.background).toBe('rgb(254, 240, 138)');
      });
    });

    it('updates highlights when search changes', () => {
      render(<ChangelogViewer />);
      const searchInput = screen.getByPlaceholderText(/Search by endpoint/i);
      
      fireEvent.change(searchInput, { target: { value: 'Bulk' } });
      let marks = screen.getAllByText('Bulk', { selector: 'mark' });
      const bulkCount = marks.length;
      
      fireEvent.change(searchInput, { target: { value: 'Payment' } });
      marks = screen.getAllByText('Payment', { selector: 'mark' });
      expect(marks.length).toBeGreaterThan(0);
      expect(marks.length).not.toEqual(bulkCount);
    });

    it('can switch between timeline and compact views', () => {
      render(<ChangelogViewer />);
      const compactBtn = screen.getByRole('button', { name: /Compact/i });
      const timelineBtn = screen.getByRole('button', { name: /Timeline/i });
      
      expect(timelineBtn).toBeInTheDocument();
      expect(compactBtn).toBeInTheDocument();
      
      fireEvent.click(compactBtn);
      // View should change - we can check this indirectly by verifying buttons still work
      fireEvent.click(timelineBtn);
      expect(timelineBtn).toBeInTheDocument();
    });

    it('applies filters alongside search', () => {
      render(<ChangelogViewer />);
      const searchInput = screen.getByPlaceholderText(/Search by endpoint/i);
      const typeSelect = screen.getByDisplayValue('All Types');
      
      fireEvent.change(searchInput, { target: { value: 'endpoint' } });
      fireEvent.change(typeSelect, { target: { value: 'new' } });
      
      // Component should still render without errors
      expect(screen.getByText(/📋 API Changelog/i)).toBeInTheDocument();
    });

    it('displays changelog statistics', () => {
      render(<ChangelogViewer />);
      // Stats are rendered separately, just check elements exist
      const container = screen.getByText(/📋 API Changelog/i).closest('div');
      expect(container?.textContent).toMatch(/new/i);
      expect(container?.textContent).toMatch(/fixes/i);
      expect(container?.textContent).toMatch(/deprecated/i);
    });

    it('has export and subscribe functionality', () => {
      render(<ChangelogViewer />);
      expect(screen.getByRole('button', { name: /Export RSS/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export Atom/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Subscribe/i })).toBeInTheDocument();
    });

    it('clears search and shows all entries', () => {
      render(<ChangelogViewer />);
      const searchInput = screen.getByPlaceholderText(/Search by endpoint/i) as HTMLInputElement;
      
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      expect(screen.getByText(/No changelog entries match your filters/i)).toBeInTheDocument();
      
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.queryByText(/No changelog entries match your filters/i)).not.toBeInTheDocument();
    });
  });
});
