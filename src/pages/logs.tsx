/**
 * Server Logs Dashboard Page
 * Demo page showing the logs analytics dashboard
 */

import React, { useState, useEffect } from 'react';
import { AdvancedLogsDashboard } from '../components/AdvancedLogsDashboard';
import { SampleLogGenerator } from '../analytics/sample-logs';
import { LogAnalyticsEngine } from '../analytics/analytics-engine';
import { ParsedLogEntry } from '../analytics/log-parser';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function LogsPage() {
  const [logs, setLogs] = useState<ParsedLogEntry[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate sample logs on mount
    const sampleLogs = SampleLogGenerator.generateSampleLogs(1000);
    setLogs(sampleLogs);

    // Calculate analytics
    const analysis = LogAnalyticsEngine.analyze(sampleLogs);
    setAnalytics(analysis);

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px' }}>
        <LoadingSkeleton className="proxypay-skeleton-grid" />
      </div>
    );
  }

  return (
    <div>
      {analytics && <AdvancedLogsDashboard logs={logs} initialAnalytics={analytics} />}
    </div>
  );
}
