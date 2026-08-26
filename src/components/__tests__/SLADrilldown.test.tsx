import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SLADrilldown } from '../SLADrilldown';

describe('SLADrilldown Component', () => {
  const mockEndpoint = {
    endpoint: 'POST /payments',
    method: 'POST' as const,
    avgResponseTime: 520,
    p50: 410,
    p95: 1250,
    p99: 2100,
    throughput: 180,
    uptime: 99.82,
    slaTarget: 800,
    slaStatus: 'warn' as const,
    category: 'Payments',
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={false} onClose={mockOnClose} />
      );
      expect(container.firstChild).toBeEmptyDOMElement();
    });

    it('should render when isOpen is true', () => {
      render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      expect(screen.getByText(/POST \/payments/)).toBeInTheDocument();
    });
  });

  describe('Header and Title', () => {
    beforeEach(() => {
      render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
    });

    it('should display the endpoint method and path', () => {
      expect(screen.getByText(/POST \/payments/)).toBeInTheDocument();
    });

    it('should display the correct SLA status badge', () => {
      expect(screen.getByText(/Warning/i)).toBeInTheDocument();
    });

    it('should have a close button', () => {
      const closeButton = screen.getByLabelText(/close drill-down/i);
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
    });

    it('should display all three tabs', () => {
      expect(screen.getByText(/Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Logs/i)).toBeInTheDocument();
      expect(screen.getByText(/Troubleshooting/i)).toBeInTheDocument();
    });

    it('should switch to Error Logs tab when clicked', () => {
      const errorLogsTab = screen.getByText(/Error Logs/i);
      fireEvent.click(errorLogsTab);
      expect(screen.getByText(/Top Error Patterns/i)).toBeInTheDocument();
    });

    it('should switch to Troubleshooting tab when clicked', () => {
      const troubleshootingTab = screen.getByText(/Troubleshooting/i);
      fireEvent.click(troubleshootingTab);
      expect(screen.getByText(/Quick Tips/i)).toBeInTheDocument();
    });
  });

  describe('Overview Tab Content', () => {
    beforeEach(() => {
      render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
    });

    it('should display warning alert for warn status', () => {
      expect(screen.getByText(/SLA Warning/i)).toBeInTheDocument();
    });

    it('should display key metrics', () => {
      expect(screen.getByText('800')).toBeInTheDocument(); // SLA Target
      expect(screen.getByText('520')).toBeInTheDocument(); // Avg Response
      expect(screen.getByText('1250')).toBeInTheDocument(); // P95
    });

    it('should display recommendations', () => {
      expect(screen.getByText(/Recommendations/i)).toBeInTheDocument();
    });
  });

  describe('Closing Modal', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      const closeButton = screen.getByLabelText(/close drill-down/i);
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      const { container } = render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      const overlay = container.querySelector('[style*="inset"]') as HTMLElement;
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content is clicked', () => {
      const { container } = render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      const modal = container.querySelector('div[style*="boxShadow"]') as HTMLElement;
      fireEvent.click(modal);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Different SLA Statuses', () => {
    it('should show breach alert for breach status', () => {
      const breachEndpoint = { ...mockEndpoint, slaStatus: 'breach' as const };
      render(
        <SLADrilldown endpoint={breachEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      expect(screen.getByText(/Critical SLA Breach/i)).toBeInTheDocument();
    });

    it('should not show alert for ok status', () => {
      const okEndpoint = { ...mockEndpoint, slaStatus: 'ok' as const };
      render(
        <SLADrilldown endpoint={okEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      expect(screen.queryByText(/SLA Warning/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Critical SLA Breach/i)).not.toBeInTheDocument();
    });
  });

  describe('Metrics Display', () => {
    it('should display all metric values correctly', () => {
      render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      expect(screen.getByText('800')).toBeInTheDocument(); // slaTarget
      expect(screen.getByText('520')).toBeInTheDocument(); // avgResponseTime
      expect(screen.getByText('1250')).toBeInTheDocument(); // p95
      expect(screen.getByText('2100')).toBeInTheDocument(); // p99
      expect(screen.getByText('180')).toBeInTheDocument(); // throughput
    });

    it('should format uptime correctly', () => {
      render(
        <SLADrilldown endpoint={mockEndpoint} isOpen={true} onClose={mockOnClose} />
      );
      expect(screen.getByText(/99\.82/)).toBeInTheDocument();
    });
  });
});
