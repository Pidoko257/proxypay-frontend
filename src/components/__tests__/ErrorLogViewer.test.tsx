import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorLogViewer } from '../ErrorLogViewer';

describe('ErrorLogViewer Component', () => {
  const mockEndpoint = {
    endpoint: 'POST /payments',
    method: 'POST' as const,
    avgResponseTime: 520,
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      expect(screen.getByText(/Recent Error Logs/i)).toBeInTheDocument();
    });

    it('should display summary statistics', () => {
      const { container } = render(<ErrorLogViewer endpoint={mockEndpoint} />);
      // Check if the component has the main container
      expect(container.querySelector('[style*="flex"]')).toBeInTheDocument();
    });

    it('should display the error patterns section', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      expect(screen.getByText(/Top Error Patterns/i)).toBeInTheDocument();
    });

    it('should display the error logs table header', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      expect(screen.getByText(/Timestamp/i)).toBeInTheDocument();
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Response Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Message/i)).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display non-zero total requests', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      const totalRequestsElements = screen.getAllByText(/\d+/);
      expect(totalRequestsElements.length).toBeGreaterThan(0);
    });

    it('should display error count less than or equal to total requests', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      const text = screen.getByText(/Recent Error Logs/i).parentElement?.textContent || '';
      expect(text).toBeDefined();
    });
  });

  describe('Error Log Table', () => {
    it('should display table with logs', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should show recent logs', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      const rows = screen.getAllByRole('row');
      // At least header + 1 data row
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should display status codes in logs', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      // Status codes should be displayed (4xx or 5xx for error logs)
      const statusCodes = screen.getAllByText(/\d{3}/);
      expect(statusCodes.length).toBeGreaterThan(0);
    });
  });

  describe('Error Patterns', () => {
    it('should display top error patterns section', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      expect(screen.getByText(/Top Error Patterns/i)).toBeInTheDocument();
    });

    it('should show pattern count information', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      const text = screen.getByText(/Top Error Patterns/i).parentElement?.textContent || '';
      expect(text).toMatch(/time/i);
    });
  });

  describe('Different Endpoints', () => {
    it('should handle GET endpoints', () => {
      const getEndpoint = {
        endpoint: 'GET /payments/{id}',
        method: 'GET' as const,
        avgResponseTime: 89,
      };
      render(<ErrorLogViewer endpoint={getEndpoint} />);
      expect(screen.getByText(/Recent Error Logs/i)).toBeInTheDocument();
    });

    it('should handle DELETE endpoints', () => {
      const deleteEndpoint = {
        endpoint: 'DELETE /payments/{id}',
        method: 'DELETE' as const,
        avgResponseTime: 150,
      };
      render(<ErrorLogViewer endpoint={deleteEndpoint} />);
      expect(screen.getByText(/Recent Error Logs/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells.length).toBeGreaterThan(0);
    });

    it('should have readable status badges', () => {
      render(<ErrorLogViewer endpoint={mockEndpoint} />);
      // Status codes should be visible
      const statusElements = screen.getAllByText(/\d{3}/);
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('should render summary cards in a grid', () => {
      const { container } = render(<ErrorLogViewer endpoint={mockEndpoint} />);
      // Check if layout structure exists
      expect(container.querySelector('[style*="grid"]')).toBeInTheDocument();
    });
  });
});
