/**
 * Server Logs Dashboard Page
 * Demo page showing the logs analytics dashboard
 */

import React, { useState, useEffect } from 'react';
import { AdvancedLogsDashboard } from '../components/AdvancedLogsDashboard';
import { ExportControls } from '../components/ExportControls';
import { SampleLogGenerator } from '../analytics/sample-logs';
import { LogAnalyticsEngine } from '../analytics/analytics-engine';
import { ParsedLogEntry } from '../analytics/log-parser';

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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading Analytics...</h2>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '20px', background: 'white', marginBottom: '20px', borderRadius: '8px' }}>
        {analytics && <ExportControls analytics={analytics} />}
      </div>

      {analytics && <AdvancedLogsDashboard logs={logs} initialAnalytics={analytics} />}
    </div>
  );
}
