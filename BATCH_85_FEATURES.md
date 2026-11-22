# Batch-85: Transaction Management Features Implementation

Comprehensive documentation for features addressing issues #504, #505, #506, and #507.

---

## Issue #504: Add Export to Common File Formats (Google Sheets, Excel)

### Feature Overview
Export transaction data to Google Sheets and Excel formats with formatting, headers, and styling.

### Google Sheets Integration

#### Google OAuth Setup
```typescript
// src/services/googleSheetsClient.ts
import { google } from 'googleapis';

interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

class GoogleSheetsService {
  private oauth2Client;

  constructor(config: GoogleSheetsConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUrl
    );
  }

  async getAuthUrl(): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getAccessToken(code: string): Promise<string> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens.access_token!;
  }

  async createSpreadsheet(title: string, accessToken: string): Promise<string> {
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    
    const resource = {
      properties: { title }
    };

    const response = await sheets.spreadsheets.create({ requestBody: resource });
    return response.data.spreadsheetId!;
  }

  async appendTransactions(
    spreadsheetId: string,
    transactions: Transaction[],
    accessToken: string
  ): Promise<void> {
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

    // Prepare headers
    const headers = [
      'Transaction ID',
      'Date',
      'Amount',
      'Currency',
      'Type',
      'Status',
      'Description',
      'Merchant',
      'Reference'
    ];

    // Prepare data rows
    const rows = transactions.map(t => [
      t.id,
      new Date(t.createdAt).toLocaleString(),
      t.amount,
      t.currency,
      t.type,
      t.status,
      t.description || '',
      t.merchant || '',
      t.reference || ''
    ]);

    // Insert data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows]
      }
    });

    // Share the sheet with read-only access
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
  }

  async getShareableLink(spreadsheetId: string): Promise<string> {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }
}

export default GoogleSheetsService;
```

#### Excel Export
```typescript
// src/services/excelExport.ts
import ExcelJS from 'exceljs';

class ExcelExportService {
  async exportTransactions(
    transactions: Transaction[],
    filename: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Define columns
    worksheet.columns = [
      { header: 'Transaction ID', key: 'id', width: 20 },
      { header: 'Date', key: 'createdAt', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Currency', key: 'currency', width: 12 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Merchant', key: 'merchant', width: 20 },
      { header: 'Reference', key: 'reference', width: 20 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'center' };

    // Add data rows with alternating row colors
    transactions.forEach((transaction, index) => {
      const row = worksheet.addRow({
        id: transaction.id,
        createdAt: new Date(transaction.createdAt).toLocaleString(),
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description || '',
        merchant: transaction.merchant || '',
        reference: transaction.reference || ''
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }

      // Format amount as currency
      row.getCell('amount').numFmt = '$#,##0.00';
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      const maxLength = Math.max(
        ...(worksheet.getColumn(column.key!).values || []).map(
          (cell) => (cell?.toString() || '').length
        )
      );
      column.width = Math.min(maxLength + 2, 50);
    });

    // Generate buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default ExcelExportService;
```

#### Export Dialog Component
```typescript
// src/components/ExportDialog.tsx
import React, { useState } from 'react';
import GoogleSheetsService from '@/services/googleSheetsClient';
import ExcelExportService from '@/services/excelExport';

interface ExportDialogProps {
  transactions: Transaction[];
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ transactions, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const excelService = new ExcelExportService();
      await excelService.exportTransactions(
        transactions,
        `transactions-${new Date().toISOString().split('T')[0]}`
      );
      setStatus('success');
    } catch (error) {
      console.error('Excel export failed:', error);
      setStatus('error');
    } finally {
      setExporting(false);
    }
  };

  const handleGoogleSheetsExport = async () => {
    setExporting(true);
    try {
      const googleService = new GoogleSheetsService({
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET!,
        redirectUrl: `${window.location.origin}/auth/google-callback`
      });

      // Get auth URL if not authenticated
      const authUrl = await googleService.getAuthUrl();
      window.location.href = authUrl;

      // After OAuth callback, create and populate spreadsheet
      const spreadsheetId = await googleService.createSpreadsheet(
        `Transactions-${new Date().toLocaleString()}`,
        localStorage.getItem('google_access_token')!
      );

      await googleService.appendTransactions(
        spreadsheetId,
        transactions,
        localStorage.getItem('google_access_token')!
      );

      const link = await googleService.getShareableLink(spreadsheetId);
      setShareLink(link);
      setStatus('success');
    } catch (error) {
      console.error('Google Sheets export failed:', error);
      setStatus('error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-dialog">
      <h2>Export Transactions</h2>
      
      {status === 'success' && (
        <div className="notification success">
          ✓ Export successful!
          {shareLink && (
            <a href={shareLink} target="_blank" rel="noopener noreferrer">
              Open in Google Sheets
            </a>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="notification error">
          ✗ Export failed. Please try again.
        </div>
      )}

      <div className="export-options">
        <button
          onClick={handleExcelExport}
          disabled={exporting}
          className="btn btn-primary"
        >
          {exporting ? 'Exporting...' : '📊 Export to Excel (.xlsx)'}
        </button>

        <button
          onClick={handleGoogleSheetsExport}
          disabled={exporting}
          className="btn btn-primary"
        >
          {exporting ? 'Exporting...' : '📈 Export to Google Sheets'}
        </button>
      </div>

      <button onClick={onClose} className="btn btn-ghost">
        Close
      </button>
    </div>
  );
};
```

---

## Issue #505: Implement Batch Actions for Multiple Transactions

### Feature Overview
Allow users to select multiple transactions and perform bulk operations.

### Table with Selection
```typescript
// src/components/TransactionTable.tsx
import React, { useState, useCallback } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';

interface TransactionTableProps {
  transactions: Transaction[];
  onBatchAction?: (selectedIds: string[], action: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onBatchAction
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [transactions]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    setShowBatchActions(newSelected.size > 0);
  }, [selectedIds]);

  const isAllSelected = selectedIds.size === transactions.length && transactions.length > 0;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < transactions.length;

  return (
    <div className="transaction-table-container">
      {showBatchActions && selectedIds.size > 0 && (
        <div className="batch-actions-bar">
          <span>{selectedIds.size} transaction(s) selected</span>
          
          <div className="batch-actions">
            <button
              onClick={() => onBatchAction?.(Array.from(selectedIds), 'mark-settled')}
              className="btn btn-sm"
            >
              Mark as Settled
            </button>
            
            <button
              onClick={() => onBatchAction?.(Array.from(selectedIds), 'mark-failed')}
              className="btn btn-sm"
            >
              Mark as Failed
            </button>

            <button
              onClick={() => onBatchAction?.(Array.from(selectedIds), 'delete')}
              className="btn btn-sm btn-danger"
            >
              Delete
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="btn btn-sm btn-ghost"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <table className="transaction-table">
        <thead>
          <tr>
            <th>
              <Checkbox
                checked={isAllSelected}
                indeterminate={isPartiallySelected}
                onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                aria-label="Select all transactions"
              />
            </th>
            <th>Transaction ID</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(transaction => (
            <tr key={transaction.id} className={selectedIds.has(transaction.id) ? 'selected' : ''}>
              <td>
                <Checkbox
                  checked={selectedIds.has(transaction.id)}
                  onChange={(e) => handleSelectRow(transaction.id, e.currentTarget.checked)}
                />
              </td>
              <td>{transaction.id}</td>
              <td>{new Date(transaction.createdAt).toLocaleString()}</td>
              <td>{transaction.amount} {transaction.currency}</td>
              <td>
                <span className={`status-badge status-${transaction.status}`}>
                  {transaction.status}
                </span>
              </td>
              <td>
                <button className="btn btn-sm">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Batch Actions Handler
```typescript
// src/hooks/useBatchActions.ts
import { useState } from 'react';
import { transactionApi } from '@/services/api';

interface BatchActionOptions {
  onSuccess?: (count: number) => void;
  onError?: (error: Error) => void;
}

export function useBatchActions(options?: BatchActionOptions) {
  const [loading, setLoading] = useState(false);
  const [undoStack, setUndoStack] = useState<Array<{ action: string; ids: string[] }>>([]);

  const executeBatchAction = async (
    transactionIds: string[],
    action: 'mark-settled' | 'mark-failed' | 'delete'
  ) => {
    setLoading(true);
    
    try {
      // Store action for undo
      setUndoStack(prev => [...prev, { action, ids: transactionIds }]);

      switch (action) {
        case 'mark-settled':
          await transactionApi.bulkUpdate(transactionIds, { status: 'settled' });
          break;
        case 'mark-failed':
          await transactionApi.bulkUpdate(transactionIds, { status: 'failed' });
          break;
        case 'delete':
          await transactionApi.bulkDelete(transactionIds);
          break;
      }

      options?.onSuccess?.(transactionIds.length);
    } catch (error) {
      options?.onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const undo = async () => {
    if (undoStack.length === 0) return;

    const [lastAction] = undoStack.slice(-1);
    setLoading(true);

    try {
      // Implement undo logic based on action type
      // This would typically require storing original state
      await transactionApi.undo(lastAction.action, lastAction.ids);
      setUndoStack(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return {
    executeBatchAction,
    undo,
    loading,
    canUndo: undoStack.length > 0
  };
}
```

---

## Issue #506: Add Real-time Transaction Updates Using WebSockets

### WebSocket Service
```typescript
// src/services/websocketClient.ts
enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<string, Set<Function>> = new Map();
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private messageQueue: any[] = [];
  private pausedMode = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.status = ConnectionStatus.CONNECTED;
          this.reconnectAttempts = 0;
          this.emit('status-change', { status: 'connected' });
          this.processPendingMessages();
          resolve();
        };

        this.ws.onmessage = (event) => {
          if (this.pausedMode) return;

          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.status = ConnectionStatus.ERROR;
          this.emit('status-change', { status: 'error' });
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.status = ConnectionStatus.DISCONNECTED;
          this.emit('status-change', { status: 'disconnected' });
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: any) {
    const { type, payload } = data;

    switch (type) {
      case 'transaction:new':
        this.emit('transaction:new', payload);
        this.emit('transaction:update-notification', {
          count: 1,
          type: 'new'
        });
        break;
      case 'transaction:updated':
        this.emit('transaction:updated', payload);
        break;
      case 'transaction:deleted':
        this.emit('transaction:deleted', payload);
        break;
      case 'connection:pong':
        // Heartbeat response
        break;
      default:
        this.emit(type, payload);
    }
  }

  private processPendingMessages() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('status-change', { status: 'failed' });
      return;
    }

    this.reconnectAttempts++;
    this.status = ConnectionStatus.RECONNECTING;
    this.emit('status-change', { status: 'reconnecting' });

    setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect().catch(() => this.attemptReconnect());
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  send(message: any) {
    if (this.status === ConnectionStatus.CONNECTED && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  subscribe(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private emit(eventType: string, data?: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  pause() {
    this.pausedMode = true;
    this.emit('status-change', { status: 'paused' });
  }

  resume() {
    this.pausedMode = false;
    this.emit('status-change', { status: 'resumed' });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = ConnectionStatus.DISCONNECTED;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isPaused(): boolean {
    return this.pausedMode;
  }
}

export { WebSocketClient, ConnectionStatus };
```

### Real-time Updates Hook
```typescript
// src/hooks/useRealtimeTransactions.ts
import { useEffect, useState, useCallback } from 'react';
import { WebSocketClient } from '@/services/websocketClient';

interface RealtimeOptions {
  autoConnect?: boolean;
  onNewTransaction?: (transaction: Transaction) => void;
}

export function useRealtimeTransactions(options: RealtimeOptions = {}) {
  const [client] = useState(() => new WebSocketClient(process.env.REACT_APP_WS_URL!));
  const [status, setStatus] = useState('disconnected');
  const [notificationCount, setNotificationCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (options.autoConnect !== false) {
      client.connect().catch(error => {
        console.error('WebSocket connection failed:', error);
      });
    }

    // Subscribe to events
    const unsubscribeStatus = client.subscribe('status-change', ({ status }: any) => {
      setStatus(status);
    });

    const unsubscribeNewTransaction = client.subscribe('transaction:new', (transaction: Transaction) => {
      setNotificationCount(prev => prev + 1);
      options.onNewTransaction?.(transaction);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeNewTransaction();
      client.disconnect();
    };
  }, [client, options]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      client.resume();
      setIsPaused(false);
    } else {
      client.pause();
      setIsPaused(true);
    }
  }, [isPaused, client]);

  const clearNotifications = useCallback(() => {
    setNotificationCount(0);
  }, []);

  return {
    status,
    notificationCount,
    isPaused,
    togglePause,
    clearNotifications
  };
}
```

### Connection Status Indicator
```typescript
// src/components/ConnectionStatus.tsx
import React from 'react';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';

export const ConnectionStatus: React.FC = () => {
  const { status, notificationCount, isPaused, togglePause, clearNotifications } = useRealtimeTransactions();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'green';
      case 'reconnecting': return 'yellow';
      case 'error':
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected': return 'Live';
      case 'reconnecting': return 'Reconnecting...';
      case 'error': return 'Connection Error';
      case 'failed': return 'Connection Failed';
      default: return 'Offline';
    }
  };

  return (
    <div className="connection-status">
      <div className={`status-indicator status-${getStatusColor()}`} />
      <span className="status-label">{getStatusLabel()}</span>

      {notificationCount > 0 && (
        <div className="notification-badge">
          {notificationCount} new
          <button onClick={clearNotifications} className="btn btn-sm">×</button>
        </div>
      )}

      <button
        onClick={togglePause}
        className={`btn btn-sm ${isPaused ? 'btn-danger' : 'btn-primary'}`}
        title={isPaused ? 'Resume updates' : 'Pause updates'}
      >
        {isPaused ? '⏸ Resume' : '▶ Pause'}
      </button>
    </div>
  );
};
```

---

## Issue #507: Fix CSV Export Doesn't Respect Current Sort Order

### Sort-Aware CSV Export
```typescript
// src/services/csvExport.ts
interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface ExportMetadata {
  exportDate: string;
  sortColumn: string;
  sortDirection: string;
  filterApplied: string;
  recordCount: number;
}

class CSVExportService {
  exportTransactionsWithSort(
    transactions: Transaction[],
    sortConfig: SortConfig,
    filters: Record<string, any> = {},
    includeAllData: boolean = false
  ): string {
    // Apply sorting
    const sortedTransactions = this.applySorting(transactions, sortConfig);

    // Prepare CSV header
    const headers = [
      'Transaction ID',
      'Date',
      'Amount',
      'Currency',
      'Type',
      'Status',
      'Description',
      'Merchant',
      'Reference'
    ];

    // Prepare metadata
    const metadata: ExportMetadata = {
      exportDate: new Date().toISOString(),
      sortColumn: sortConfig.column,
      sortDirection: sortConfig.direction,
      filterApplied: Object.keys(filters).join(', '),
      recordCount: sortedTransactions.length
    };

    // Build CSV
    let csv = this.buildMetadataSection(metadata);
    csv += '\n\n'; // Blank line separator
    csv += headers.map(h => this.escapeCsvField(h)).join(',') + '\n';

    // Add data rows
    sortedTransactions.forEach(transaction => {
      const row = [
        transaction.id,
        new Date(transaction.createdAt).toLocaleString(),
        transaction.amount,
        transaction.currency,
        transaction.type,
        transaction.status,
        transaction.description || '',
        transaction.merchant || '',
        transaction.reference || ''
      ];
      csv += row.map(field => this.escapeCsvField(String(field))).join(',') + '\n';
    });

    return csv;
  }

  private applySorting(transactions: Transaction[], sortConfig: SortConfig): Transaction[] {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
      let aVal = (a as any)[sortConfig.column];
      let bVal = (b as any)[sortConfig.column];

      // Handle date sorting
      if (sortConfig.column === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle string sorting
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    return sorted;
  }

  private buildMetadataSection(metadata: ExportMetadata): string {
    const lines = [
      `Export Date,${metadata.exportDate}`,
      `Sort Column,${metadata.sortColumn}`,
      `Sort Direction,${metadata.sortDirection}`,
      `Filters,${metadata.filterApplied || 'None'}`,
      `Total Records,${metadata.recordCount}`
    ];
    return lines.join('\n');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}

export default CSVExportService;
```

### Export Confirmation Dialog
```typescript
// src/components/ExportConfirmationDialog.tsx
import React, { useState } from 'react';
import CSVExportService from '@/services/csvExport';

interface ExportConfirmationDialogProps {
  transactions: Transaction[];
  sortConfig: { column: string; direction: 'asc' | 'desc' };
  filters: Record<string, any>;
  onClose: () => void;
}

export const ExportConfirmationDialog: React.FC<ExportConfirmationDialogProps> = ({
  transactions,
  sortConfig,
  filters,
  onClose
}) => {
  const [includeAllData, setIncludeAllData] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csvService = new CSVExportService();
      const csv = csvService.exportTransactionsWithSort(
        transactions,
        sortConfig,
        filters,
        includeAllData
      );

      csvService.downloadCSV(
        csv,
        `transactions-${new Date().toISOString().split('T')[0]}`
      );

      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Export Transactions as CSV</h2>

        <div className="export-details">
          <h3>Export Details</h3>
          <ul>
            <li>
              <strong>Sort:</strong> {sortConfig.column} ({sortConfig.direction})
            </li>
            <li>
              <strong>Filters:</strong> {Object.keys(filters).length > 0 ? Object.keys(filters).join(', ') : 'None'}
            </li>
            <li>
              <strong>Records:</strong> {transactions.length}
            </li>
          </ul>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={includeAllData}
              onChange={(e) => setIncludeAllData(e.currentTarget.checked)}
            />
            Export all data (ignore current filters)
          </label>
        </div>

        <div className="modal-actions">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-primary"
          >
            {exporting ? 'Exporting...' : 'Download CSV'}
          </button>
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Testing Requirements

### Unit Tests
- [ ] CSV export respects sort order (asc/desc)
- [ ] CSV export includes metadata section
- [ ] CSV export handles filters correctly
- [ ] Excel export with formatting and styling
- [ ] Google Sheets OAuth flow
- [ ] Batch select/deselect all
- [ ] Batch action execution
- [ ] WebSocket connection and reconnection
- [ ] WebSocket message handling
- [ ] Pause/resume functionality

### Integration Tests
- [ ] Full CSV export with sort and filters
- [ ] Excel download triggers correctly
- [ ] Google Sheets creation and sharing
- [ ] WebSocket real-time updates
- [ ] Batch actions update transaction state
- [ ] Connection status indicator updates

### E2E Tests
- [ ] User exports CSV with current sort
- [ ] User selects multiple rows and applies batch action
- [ ] Real-time notification appears on new transaction
- [ ] Export dialog shows correct details before download

---

## Deployment Checklist
- [ ] Install ExcelJS and Google API dependencies
- [ ] Configure Google OAuth credentials
- [ ] Set WebSocket URL in environment
- [ ] Add CSV/Excel/Sheets export UI to transaction table
- [ ] Implement batch selection UI
- [ ] Connect WebSocket client to transaction updates
- [ ] Add connection status indicator
- [ ] Test all export formats
- [ ] Test batch operations
- [ ] Test WebSocket reconnection
- [ ] Monitor WebSocket connection health
- [ ] Document export formats and capabilities
