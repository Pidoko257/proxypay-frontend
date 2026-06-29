import React, { useState, useEffect, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

interface StatusIncident {
  id: string;
  name: string;
  status: string;
  severity: 'critical' | 'major' | 'minor';
  shortlink: string;
  page?: string;
}

interface StatusResponse {
  page: { id: string; name: string; url: string; updated_at: string };
  incidents: StatusIncident[];
  scheduled_maintenances: StatusIncident[];
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  major: { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  minor: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
};

export default function StatusBanner(): React.JSX.Element | null {
  const { siteConfig } = useDocusaurusContext();
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const statusPageUrl = siteConfig.customFields?.statusPageUrl as string || 'https://status.proxypay.com';
  const statusApiUrl = siteConfig.customFields?.statusApiUrl as string || `${statusPageUrl}/api/v2`;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${statusApiUrl}/incidents.json`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const data: StatusResponse = await res.json();
      const active = (data.incidents || []).filter(
        (i) => i.status !== 'resolved' && i.status !== 'postmortem',
      );
      const maintenance = (data.scheduled_maintenances || []).filter(
        (m) => m.status === 'in_progress' || m.status === 'scheduled',
      );
      setIncidents([...active, ...maintenance]);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [statusApiUrl]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading || incidents.length === 0) return null;

  const topIncident = incidents.reduce((a, b) => {
    const order = { critical: 0, major: 1, minor: 2 };
    return (order[a.severity] ?? 2) <= (order[b.severity] ?? 2) ? a : b;
  });

  const { bg, text, border } = SEVERITY_COLORS[topIncident.severity] || SEVERITY_COLORS.minor;

  return (
    <div
      style={{
        backgroundColor: bg,
        color: text,
        borderBottom: `2px solid ${border}`,
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ textTransform: 'capitalize' }}>{topIncident.severity}</span>
      <span>{topIncident.name}</span>
      <a
        href={statusPageUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: text, textDecoration: 'underline', fontWeight: 600 }}
      >
        View details →
      </a>
    </div>
  );
}
