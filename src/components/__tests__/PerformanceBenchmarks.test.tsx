import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceBenchmarks from '../PerformanceBenchmarks';

describe('PerformanceBenchmarks Component with SLA Drill-down', () => {
  describe('Rendering', () => {
    it('should render the performance benchmarks page', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getByText(/Performance Benchmarks/i)).toBeInTheDocument();
    });

    it('should display the summary cards', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getByText(/Avg p50 Latency/i)).toBeInTheDocument();
      expect(screen.getByText(/Avg Throughput/i)).toBeInTheDocument();
      expect(screen.getByText(/Avg Uptime/i)).toBeInTheDocument();
      expect(screen.getByText(/SLA OK/i)).toBeInTheDocument();
    });

    it('should display the endpoints table', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Filter Controls', () => {
    it('should display search input', () => {
      render(<PerformanceBenchmarks />);
      const searchInput = screen.getByPlaceholderText(/Search endpoints/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should display category filter', () => {
      render(<PerformanceBenchmarks />);
      const categoryFilter = screen.getByDisplayValue(/All Categories/i);
      expect(categoryFilter).toBeInTheDocument();
    });

    it('should display SLA status filter', () => {
      render(<PerformanceBenchmarks />);
      const slaFilter = screen.getByDisplayValue(/All SLA Status/i);
      expect(slaFilter).toBeInTheDocument();
    });
  });

  describe('SLA Status Badges', () => {
    it('should display SLA status badges in table', () => {
      render(<PerformanceBenchmarks />);
      const badges = screen.getAllByText(/✅ OK|⚠ Warn|🔴 Breach/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should make breach badges clickable', () => {
      render(<PerformanceBenchmarks />);
      const breachBadges = screen.getAllByText(/🔴 Breach/);
      if (breachBadges.length > 0) {
        expect(breachBadges[0]).toBeInTheDocument();
        expect(breachBadges[0]).toHaveStyle({ cursor: 'pointer' });
      }
    });

    it('should make warning badges clickable', () => {
      render(<PerformanceBenchmarks />);
      const warnBadges = screen.getAllByText(/⚠ Warn/);
      if (warnBadges.length > 0) {
        expect(warnBadges[0]).toBeInTheDocument();
        expect(warnBadges[0]).toHaveStyle({ cursor: 'pointer' });
      }
    });
  });

  describe('Drill-down Navigation', () => {
    it('should open drill-down when clicking warn badge', () => {
      render(<PerformanceBenchmarks />);
      const warnBadges = screen.getAllByText(/⚠ Warn/);
      if (warnBadges.length > 0) {
        fireEvent.click(warnBadges[0]);
        // Drill-down modal should appear with endpoint details
        expect(screen.getByText(/Overview/i)).toBeInTheDocument();
        expect(screen.getByText(/Error Logs/i)).toBeInTheDocument();
      }
    });

    it('should open drill-down when clicking breach badge', () => {
      render(<PerformanceBenchmarks />);
      const breachBadges = screen.getAllByText(/🔴 Breach/);
      if (breachBadges.length > 0) {
        fireEvent.click(breachBadges[0]);
        expect(screen.getByText(/Overview/i)).toBeInTheDocument();
      }
    });

    it('should not open drill-down for OK status', () => {
      render(<PerformanceBenchmarks />);
      const okBadges = screen.getAllByText(/✅ OK/);
      if (okBadges.length > 0) {
        const initialOverviewCount = screen.getAllByText(/Overview/i).length;
        fireEvent.click(okBadges[0]);
        const finalOverviewCount = screen.getAllByText(/Overview/i).length;
        expect(finalOverviewCount).toBe(initialOverviewCount);
      }
    });
  });

  describe('Table Interactions', () => {
    it('should allow selecting endpoint for trend view', () => {
      render(<PerformanceBenchmarks />);
      const rows = screen.getAllByRole('row');
      if (rows.length > 1) {
        fireEvent.click(rows[1]);
        expect(screen.getByText(/Latency Trend/i)).toBeInTheDocument();
      }
    });

    it('should allow searching endpoints', () => {
      render(<PerformanceBenchmarks />);
      const searchInput = screen.getByPlaceholderText(/Search endpoints/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '/payments' } });
      expect(searchInput.value).toBe('/payments');
    });

    it('should allow filtering by category', () => {
      render(<PerformanceBenchmarks />);
      const categoryFilter = screen.getByDisplayValue(/All Categories/i) as HTMLSelectElement;
      fireEvent.change(categoryFilter, { target: { value: 'Payments' } });
      expect(categoryFilter.value).toBe('Payments');
    });

    it('should allow filtering by SLA status', () => {
      render(<PerformanceBenchmarks />);
      const slaFilter = screen.getByDisplayValue(/All SLA Status/i) as HTMLSelectElement;
      fireEvent.change(slaFilter, { target: { value: 'warn' } });
      expect(slaFilter.value).toBe('warn');
    });
  });

  describe('Drill-down Modal Features', () => {
    beforeEach(() => {
      render(<PerformanceBenchmarks />);
      const warnBadges = screen.getAllByText(/⚠ Warn/);
      if (warnBadges.length > 0) {
        fireEvent.click(warnBadges[0]);
      }
    });

    it('should display drill-down tabs', () => {
      expect(screen.getByText(/Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Logs/i)).toBeInTheDocument();
      expect(screen.getByText(/Troubleshooting/i)).toBeInTheDocument();
    });

    it('should switch between tabs in drill-down', () => {
      const errorLogsTab = screen.getByText(/Error Logs/i);
      fireEvent.click(errorLogsTab);
      expect(screen.getByText(/Top Error Patterns/i)).toBeInTheDocument();
    });

    it('should close drill-down modal', () => {
      const closeButtons = screen.getAllByLabelText(/close drill-down/i);
      if (closeButtons.length > 0) {
        fireEvent.click(closeButtons[0]);
        // Modal should be closed, tabs should not be visible anymore
        expect(screen.queryByText(/Overview/i)).not.toBeInTheDocument();
      }
    });
  });

  describe('Performance Reference Section', () => {
    it('should display performance targets section', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getByText(/Performance Targets/i)).toBeInTheDocument();
    });

    it('should display performance target details', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getByText(/p50.*200ms/)).toBeInTheDocument();
      expect(screen.getByText(/p99.*1000ms/)).toBeInTheDocument();
      expect(screen.getByText(/99\.9%/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should display responsive grid layout', () => {
      const { container } = render(<PerformanceBenchmarks />);
      const summaryCards = container.querySelector('[style*="gridTemplateColumns"]');
      expect(summaryCards).toBeInTheDocument();
    });

    it('should display table with proper styling', () => {
      render(<PerformanceBenchmarks />);
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display endpoint method badges', () => {
      render(<PerformanceBenchmarks />);
      const methods = screen.getAllByText(/GET|POST|PUT|DELETE/);
      expect(methods.length).toBeGreaterThan(0);
    });

    it('should display latency metrics as bars', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getAllByText(/ms/).length).toBeGreaterThan(0);
    });

    it('should display throughput values', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getAllByText(/req\/s/).length).toBeGreaterThan(0);
    });

    it('should display uptime percentages', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<PerformanceBenchmarks />);
      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have descriptive filter labels', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getByPlaceholderText(/Search endpoints/i)).toBeInTheDocument();
    });

    it('should display all section titles', () => {
      render(<PerformanceBenchmarks />);
      expect(screen.getByText(/Performance Benchmarks/i)).toBeInTheDocument();
    });
  });
});
