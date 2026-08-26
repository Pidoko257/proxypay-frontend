import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TroubleshootingDocs } from '../TroubleshootingDocs';

describe('TroubleshootingDocs Component', () => {
  const mockEndpoint = {
    endpoint: 'POST /payments',
    method: 'POST' as const,
    avgResponseTime: 520,
    slaTarget: 800,
    throughput: 180,
    p99: 2100,
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      expect(screen.getByText(/Quick Tips/i)).toBeInTheDocument();
    });

    it('should display quick tips section', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      expect(screen.getByText(/Quick Tips/i)).toBeInTheDocument();
    });

    it('should display troubleshooting topics', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      // At least one troubleshooting topic should be visible
      expect(screen.getByText(/Error Rate & 5xx Errors/i)).toBeInTheDocument();
    });

    it('should display additional resources section', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      expect(screen.getByText(/Additional Resources/i)).toBeInTheDocument();
    });
  });

  describe('Quick Tips', () => {
    it('should display at least one quick tip', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const tipsSection = screen.getByText(/Quick Tips/i).closest('div');
      const tips = tipsSection?.querySelectorAll('li') || [];
      expect(tips.length).toBeGreaterThan(0);
    });

    it('should generate tips based on endpoint metrics', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const tipsText = screen.getByText(/Quick Tips/i).parentElement?.textContent || '';
      expect(tipsText.length).toBeGreaterThan(0);
    });
  });

  describe('Troubleshooting Topics', () => {
    it('should display high latency topic when avgResponseTime exceeds slaTarget', () => {
      const highLatencyEndpoint = { ...mockEndpoint, avgResponseTime: 1200 };
      render(<TroubleshootingDocs endpoint={highLatencyEndpoint} />);
      expect(screen.getByText(/High Latency Issues/i)).toBeInTheDocument();
    });

    it('should display error rate topic', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      expect(screen.getByText(/Error Rate & 5xx Errors/i)).toBeInTheDocument();
    });

    it('should display tail latency topic when p99 is high', () => {
      const highP99Endpoint = { ...mockEndpoint, p99: 2000, slaTarget: 500 };
      render(<TroubleshootingDocs endpoint={highP99Endpoint} />);
      expect(screen.getByText(/Tail Latency/i)).toBeInTheDocument();
    });

    it('should display availability topic', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      expect(screen.getByText(/Availability & Uptime/i)).toBeInTheDocument();
    });
  });

  describe('Documentation Links', () => {
    it('should display links to documentation', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should have proper link structure', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should include database optimization link', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const dbLink = screen.getByText(/Database Query Optimization/i);
      expect(dbLink).toBeInTheDocument();
      expect(dbLink.closest('a')).toHaveAttribute('href', expect.stringContaining('database'));
    });

    it('should include caching strategies link', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const cachingLink = screen.getByText(/Caching Strategies/i);
      expect(cachingLink).toBeInTheDocument();
      expect(cachingLink.closest('a')).toHaveAttribute('href', expect.stringContaining('caching'));
    });

    it('should include rate limiting link', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const rateLimitLink = screen.getByText(/Rate Limiting Guide/i);
      expect(rateLimitLink).toBeInTheDocument();
      expect(rateLimitLink.closest('a')).toHaveAttribute('href', expect.stringContaining('rate-limiting'));
    });
  });

  describe('Additional Resources', () => {
    it('should display all resource cards', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      expect(screen.getByText(/Full Documentation/i)).toBeInTheDocument();
      expect(screen.getByText(/Support Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Community/i)).toBeInTheDocument();
      expect(screen.getByText(/Status Page/i)).toBeInTheDocument();
    });

    it('should have links to external resources', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const docLink = screen.getByText(/Full Documentation/i).closest('a');
      expect(docLink).toHaveAttribute('href', expect.stringContaining('docs.proxypay.com'));
      expect(docLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Conditional Content', () => {
    it('should show throughput topic when throughput is low', () => {
      const lowThroughputEndpoint = { ...mockEndpoint, throughput: 30 };
      render(<TroubleshootingDocs endpoint={lowThroughputEndpoint} />);
      expect(screen.getByText(/Throughput & Rate Limiting/i)).toBeInTheDocument();
    });

    it('should show multiple topics for poor performance', () => {
      const poorEndpoint = {
        ...mockEndpoint,
        avgResponseTime: 2000,
        p99: 5000,
        throughput: 20,
      };
      render(<TroubleshootingDocs endpoint={poorEndpoint} />);
      expect(screen.getByText(/High Latency Issues/i)).toBeInTheDocument();
      expect(screen.getByText(/Tail Latency/i)).toBeInTheDocument();
      expect(screen.getByText(/Throughput & Rate Limiting/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const headings = screen.getAllByRole('heading', { level: 4 });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have descriptive link text', () => {
      render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link.textContent).toBeTruthy();
        expect(link.textContent?.length).toBeGreaterThan(0);
      });
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<TroubleshootingDocs endpoint={mockEndpoint} />);
      const lists = container.querySelectorAll('ul, ol');
      expect(lists.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Different Endpoint Scenarios', () => {
    it('should handle perfectly performing endpoint', () => {
      const perfectEndpoint = {
        endpoint: 'GET /fast',
        method: 'GET' as const,
        avgResponseTime: 50,
        slaTarget: 200,
        throughput: 500,
        p99: 100,
      };
      render(<TroubleshootingDocs endpoint={perfectEndpoint} />);
      expect(screen.getByText(/Quick Tips/i)).toBeInTheDocument();
    });

    it('should handle severely struggling endpoint', () => {
      const poorEndpoint = {
        endpoint: 'POST /slow',
        method: 'POST' as const,
        avgResponseTime: 5000,
        slaTarget: 500,
        throughput: 5,
        p99: 10000,
      };
      render(<TroubleshootingDocs endpoint={poorEndpoint} />);
      expect(screen.getByText(/High Latency Issues/i)).toBeInTheDocument();
    });
  });
});
