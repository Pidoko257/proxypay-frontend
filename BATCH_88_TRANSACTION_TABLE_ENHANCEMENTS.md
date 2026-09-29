# Batch-88: ProxyPay Transaction Table Enhancements

Comprehensive implementation documentation for transaction table UI/UX improvements addressing issues #496, #497, #498, and #499.

---

## Issue #496: Add Pagination to Transaction Table

### Pagination Service

```typescript
// src/services/pagination.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PaginationState {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class PaginationService {
  private paginationState$ = new BehaviorSubject<PaginationState>({
    pageNumber: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 0,
  });

  private readonly PAGE_SIZE_KEY = 'transaction_page_size';
  private readonly VALID_PAGE_SIZES = [10, 25, 50, 100];

  constructor() {
    this.loadPageSizePreference();
  }

  getPaginationState(): Observable<PaginationState> {
    return this.paginationState$.asObservable();
  }

  getCurrentState(): PaginationState {
    return this.paginationState$.value;
  }

  setPageSize(size: number): void {
    if (!this.VALID_PAGE_SIZES.includes(size)) {
      console.warn(`Invalid page size: ${size}`);
      return;
    }

    const currentState = this.paginationState$.value;
    this.paginationState$.next({
      ...currentState,
      pageSize: size,
      pageNumber: 1, // Reset to first page
    });

    this.savePageSizePreference(size);
  }

  goToPage(pageNumber: number): void {
    const state = this.paginationState$.value;
    
    if (pageNumber < 1 || pageNumber > state.totalPages) {
      console.warn(`Invalid page number: ${pageNumber}`);
      return;
    }

    this.paginationState$.next({
      ...state,
      pageNumber,
    });
  }

  nextPage(): void {
    const state = this.paginationState$.value;
    if (state.pageNumber < state.totalPages) {
      this.goToPage(state.pageNumber + 1);
    }
  }

  previousPage(): void {
    const state = this.paginationState$.value;
    if (state.pageNumber > 1) {
      this.goToPage(state.pageNumber - 1);
    }
  }

  updateTotalCount(totalCount: number): void {
    const state = this.paginationState$.value;
    const totalPages = Math.ceil(totalCount / state.pageSize);

    this.paginationState$.next({
      ...state,
      totalCount,
      totalPages,
    });
  }

  reset(): void {
    this.paginationState$.next({
      pageNumber: 1,
      pageSize: this.paginationState$.value.pageSize,
      totalCount: 0,
      totalPages: 0,
    });
  }

  private savePageSizePreference(size: number): void {
    localStorage.setItem(this.PAGE_SIZE_KEY, size.toString());
  }

  private loadPageSizePreference(): void {
    const saved = localStorage.getItem(this.PAGE_SIZE_KEY);
    if (saved && this.VALID_PAGE_SIZES.includes(parseInt(saved))) {
      const state = this.paginationState$.value;
      this.paginationState$.next({
        ...state,
        pageSize: parseInt(saved),
      });
    }
  }
}
```

### Transaction Table with Pagination

```typescript
// src/components/transaction-table/transaction-table.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { TransactionService } from '../../services/transaction.service';
import { PaginationService, PaginationState } from '../../services/pagination.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss'],
})
export class TransactionTableComponent implements OnInit, OnDestroy {
  transactions: any[] = [];
  pagination: PaginationState | null = null;
  loading = false;
  error: string | null = null;
  jumpToPage = 1;

  readonly PAGE_SIZES = [10, 25, 50, 100];

  private destroy$ = new Subject<void>();

  constructor(
    private transactionService: TransactionService,
    private paginationService: PaginationService,
  ) {}

  ngOnInit(): void {
    // Subscribe to pagination state
    this.paginationService.getPaginationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.pagination = state;
        this.loadTransactions();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTransactions(): void {
    if (!this.pagination) return;

    this.loading = true;
    this.error = null;

    this.transactionService
      .getTransactions(
        this.pagination.pageNumber,
        this.pagination.pageSize,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.transactions = response.data;
          this.paginationService.updateTotalCount(response.totalCount);
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load transactions';
          this.loading = false;
        },
      });
  }

  changePageSize(size: number): void {
    this.paginationService.setPageSize(size);
  }

  goToFirstPage(): void {
    this.paginationService.goToPage(1);
  }

  goToPreviousPage(): void {
    this.paginationService.previousPage();
  }

  goToNextPage(): void {
    this.paginationService.nextPage();
  }

  goToLastPage(): void {
    if (this.pagination) {
      this.paginationService.goToPage(this.pagination.totalPages);
    }
  }

  jumpToPageHandler(): void {
    if (this.pagination && this.jumpToPage >= 1 && this.jumpToPage <= this.pagination.totalPages) {
      this.paginationService.goToPage(this.jumpToPage);
    }
  }

  getResultsText(): string {
    if (!this.pagination || this.pagination.totalCount === 0) {
      return 'No results';
    }

    const start = (this.pagination.pageNumber - 1) * this.pagination.pageSize + 1;
    const end = Math.min(
      this.pagination.pageNumber * this.pagination.pageSize,
      this.pagination.totalCount,
    );

    return `Showing ${start}-${end} of ${this.pagination.totalCount}`;
  }

  isFirstPage(): boolean {
    return this.pagination?.pageNumber === 1;
  }

  isLastPage(): boolean {
    return this.pagination?.pageNumber === this.pagination?.totalPages;
  }
}
```

### Template

```html
<!-- src/components/transaction-table/transaction-table.component.html -->
<div class="transaction-table-container">
  <!-- Table Controls -->
  <div class="table-controls">
    <div class="page-size-selector">
      <label>Rows per page:</label>
      <select [ngModel]="pagination?.pageSize" (change)="changePageSize($event.target.value)">
        <option *ngFor="let size of PAGE_SIZES" [value]="size">{{ size }}</option>
      </select>
    </div>

    <div class="results-text">
      {{ getResultsText() }}
    </div>
  </div>

  <!-- Loading State -->
  <div *ngIf="loading" class="loading-state">
    <mat-spinner diameter="40"></mat-spinner>
    <p>Loading transactions...</p>
  </div>

  <!-- Error State -->
  <div *ngIf="error" class="error-state">
    <p>{{ error }}</p>
    <button (click)="ngOnInit()">Retry</button>
  </div>

  <!-- Transaction Table -->
  <table *ngIf="!loading && !error" class="transaction-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Transaction ID</th>
        <th>Amount</th>
        <th>Fee</th>
        <th>Provider</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let transaction of transactions">
        <td>{{ transaction.createdAt | date: 'short' }}</td>
        <td>{{ transaction.id }}</td>
        <td>{{ transaction.amount | currency }}</td>
        <td>{{ transaction.fee | currency }}</td>
        <td>{{ transaction.provider }}</td>
        <td>
          <span class="status-badge" [ngClass]="'status-' + transaction.status">
            {{ transaction.status }}
          </span>
        </td>
        <td>
          <button class="action-btn">View</button>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Pagination Controls -->
  <div *ngIf="!loading && !error && pagination && pagination.totalCount > 0" class="pagination-controls">
    <div class="pagination-buttons">
      <button 
        [disabled]="isFirstPage()" 
        (click)="goToFirstPage()"
        title="First page">
        ⏮
      </button>
      <button 
        [disabled]="isFirstPage()" 
        (click)="goToPreviousPage()"
        title="Previous page">
        ◀
      </button>

      <div class="page-indicator">
        <span>Page {{ pagination.pageNumber }} of {{ pagination.totalPages }}</span>
      </div>

      <button 
        [disabled]="isLastPage()" 
        (click)="goToNextPage()"
        title="Next page">
        ▶
      </button>
      <button 
        [disabled]="isLastPage()" 
        (click)="goToLastPage()"
        title="Last page">
        ⏭
      </button>
    </div>

    <div class="jump-to-page">
      <input 
        type="number" 
        [(ngModel)]="jumpToPage" 
        min="1" 
        [max]="pagination.totalPages"
        placeholder="Go to page">
      <button (click)="jumpToPageHandler()">Go</button>
    </div>
  </div>
</div>
```

---

## Issue #497: Implement Sorting for All Transaction Table Columns

### Sort Service

```typescript
// src/services/sort.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

@Injectable({ providedIn: 'root' })
export class SortService {
  private sortState$ = new BehaviorSubject<SortState>({
    column: 'createdAt',
    direction: 'desc',
  });

  private readonly SORT_STATE_KEY = 'transaction_sort_state';

  constructor() {
    this.loadSortPreference();
  }

  getSortState(): Observable<SortState> {
    return this.sortState$.asObservable();
  }

  getCurrentSort(): SortState {
    return this.sortState$.value;
  }

  setSortColumn(column: string, shiftKey: boolean = false): void {
    const current = this.sortState$.value;

    // If same column, toggle direction. Otherwise, set new column with asc
    if (current.column === column && !shiftKey) {
      const newDirection: SortDirection = 
        current.direction === 'asc' ? 'desc' : 
        current.direction === 'desc' ? null : 'asc';

      this.sortState$.next({
        column: newDirection ? column : null,
        direction: newDirection,
      });
    } else {
      this.sortState$.next({
        column,
        direction: 'asc',
      });
    }

    this.saveSortPreference();
  }

  clearSort(): void {
    this.sortState$.next({
      column: null,
      direction: null,
    });
    this.saveSortPreference();
  }

  private saveSortPreference(): void {
    const state = this.sortState$.value;
    localStorage.setItem(this.SORT_STATE_KEY, JSON.stringify(state));
  }

  private loadSortPreference(): void {
    const saved = localStorage.getItem(this.SORT_STATE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.sortState$.next(state);
      } catch {
        // Invalid saved state, use default
      }
    }
  }
}
```

### Transaction Table with Sorting

```typescript
// src/components/transaction-table/transaction-table.component.ts (enhanced)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { SortService, SortState } from '../../services/sort.service';

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss'],
})
export class TransactionTableComponent implements OnInit, OnDestroy {
  // ... existing code ...
  sort: SortState | null = null;

  private readonly SORTABLE_COLUMNS = [
    'createdAt',
    'amount',
    'fee',
    'provider',
    'status',
  ];

  constructor(
    private transactionService: TransactionService,
    private paginationService: PaginationService,
    private sortService: SortService,
  ) {}

  ngOnInit(): void {
    // Subscribe to sort state
    this.sortService.getSortState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.sort = state;
        this.loadTransactions();
      });

    // ... existing pagination subscription ...
  }

  private loadTransactions(): void {
    if (!this.pagination) return;

    this.loading = true;
    this.error = null;

    const sortBy = this.sort?.column || undefined;
    const sortDir = this.sort?.direction || undefined;

    this.transactionService
      .getTransactions(
        this.pagination.pageNumber,
        this.pagination.pageSize,
        sortBy,
        sortDir,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.transactions = response.data;
          this.paginationService.updateTotalCount(response.totalCount);
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load transactions';
          this.loading = false;
        },
      });
  }

  onColumnHeaderClick(column: string, event: MouseEvent): void {
    if (!this.SORTABLE_COLUMNS.includes(column)) return;

    this.sortService.setSortColumn(column, event.shiftKey);
  }

  getSortIndicator(column: string): string {
    if (this.sort?.column !== column) return '';
    return this.sort?.direction === 'asc' ? '↑' : '↓';
  }

  isSortable(column: string): boolean {
    return this.SORTABLE_COLUMNS.includes(column);
  }

  isSorted(column: string): boolean {
    return this.sort?.column === column;
  }
}
```

### Template Enhancement

```html
<!-- Column headers with sort indicators -->
<table class="transaction-table">
  <thead>
    <tr>
      <th 
        *ngFor="let column of ['createdAt', 'amount', 'fee', 'provider', 'status', 'actions']"
        [class.sortable]="isSortable(column)"
        [class.sorted]="isSorted(column)"
        (click)="onColumnHeaderClick(column, $event)"
        [title]="isSortable(column) ? 'Click to sort (Shift+click for multi-sort)' : ''">
        
        <span *ngIf="column === 'createdAt'">Date</span>
        <span *ngIf="column === 'amount'">Amount</span>
        <span *ngIf="column === 'fee'">Fee</span>
        <span *ngIf="column === 'provider'">Provider</span>
        <span *ngIf="column === 'status'">Status</span>
        <span *ngIf="column === 'actions'">Actions</span>

        <span *ngIf="isSortable(column)" class="sort-indicator">
          {{ getSortIndicator(column) }}
        </span>
      </th>
    </tr>
  </thead>
  <!-- ... rest of table ... -->
</table>
```

---

## Issue #498: Add Empty State Design to Transaction Table

### Empty State Component

```typescript
// src/components/empty-state/empty-state.component.ts
import { Component, Input } from '@angular/core';

export type EmptyStateType = 'no-data' | 'no-results' | 'error';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
})
export class EmptyStateComponent {
  @Input() type: EmptyStateType = 'no-data';
  @Input() hasActiveFilters = false;
  @Input() onClearFilters?: () => void;

  getIcon(): string {
    switch (this.type) {
      case 'no-data':
        return '📋';
      case 'no-results':
        return '🔍';
      case 'error':
        return '⚠️';
      default:
        return '📋';
    }
  }

  getTitle(): string {
    switch (this.type) {
      case 'no-data':
        return 'No Transactions Yet';
      case 'no-results':
        return 'No Matching Transactions';
      case 'error':
        return 'Error Loading Transactions';
      default:
        return 'No Transactions';
    }
  }

  getDescription(): string {
    switch (this.type) {
      case 'no-data':
        return 'Start by creating your first transaction or importing existing data.';
      case 'no-results':
        return this.hasActiveFilters
          ? 'Try adjusting your filters or clearing them to see all transactions.'
          : 'No transactions match your search criteria.';
      case 'error':
        return 'We encountered an error loading your transactions. Please try again.';
      default:
        return 'No transactions available.';
    }
  }
}
```

### Template

```html
<!-- src/components/empty-state/empty-state.component.html -->
<div class="empty-state">
  <div class="empty-state-icon">{{ getIcon() }}</div>
  
  <h3 class="empty-state-title">{{ getTitle() }}</h3>
  
  <p class="empty-state-description">
    {{ getDescription() }}
  </p>

  <div class="empty-state-actions">
    <button *ngIf="hasActiveFilters && onClearFilters" 
      (click)="onClearFilters()" 
      class="btn btn-primary">
      Clear Filters
    </button>

    <button *ngIf="type === 'no-data'" class="btn btn-secondary">
      Create Transaction
    </button>

    <a *ngIf="type === 'no-data'" href="/docs" class="btn btn-ghost">
      View Documentation
    </a>

    <button *ngIf="type === 'error'" class="btn btn-primary">
      Retry
    </button>
  </div>
</div>
```

### Integration with Transaction Table

```typescript
// src/components/transaction-table/transaction-table.component.ts (enhanced)
export class TransactionTableComponent implements OnInit, OnDestroy {
  // ... existing code ...
  hasActiveFilters = false;
  emptyStateType: 'no-data' | 'no-results' | 'error' = 'no-data';

  determineEmptyState(): void {
    if (this.error) {
      this.emptyStateType = 'error';
      return;
    }

    if (!this.pagination || this.pagination.totalCount === 0) {
      this.emptyStateType = this.hasActiveFilters ? 'no-results' : 'no-data';
    }
  }

  clearFilters(): void {
    // Clear all active filters
    this.hasActiveFilters = false;
    this.loadTransactions();
  }
}
```

### Template

```html
<!-- In transaction-table.component.html -->
<div class="transaction-table-container">
  <!-- ... existing controls ... -->

  <!-- Empty State -->
  <app-empty-state 
    *ngIf="!loading && transactions.length === 0"
    [type]="emptyStateType"
    [hasActiveFilters]="hasActiveFilters"
    [onClearFilters]="clearFilters">
  </app-empty-state>

  <!-- Transaction Table (show only if not empty) -->
  <table *ngIf="!loading && transactions.length > 0" class="transaction-table">
    <!-- ... existing table content ... -->
  </table>

  <!-- ... pagination controls ... -->
</div>
```

---

## Issue #499: Implement CSV Export Progress for Large Datasets

### CSV Export Service

```typescript
// src/services/csv-export.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ExportProgress {
  currentRow: number;
  totalRows: number;
  percentage: number;
  estimatedTimeRemaining: number; // seconds
  isComplete: boolean;
  isCancelled: boolean;
}

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  private progress$ = new Subject<ExportProgress>();
  private cancelExport$ = new Subject<void>();
  private isExporting = false;

  getProgress(): Observable<ExportProgress> {
    return this.progress$.asObservable();
  }

  async exportTransactions(
    transactions: any[],
    filename: string,
  ): Promise<void> {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    this.isExporting = true;
    const startTime = Date.now();
    const CHUNK_SIZE = 100; // Process 100 rows at a time

    try {
      const headers = [
        'Date',
        'Transaction ID',
        'Amount',
        'Fee',
        'Provider',
        'Status',
      ];

      let csvContent = headers.join(',') + '\n';
      const totalRows = transactions.length;

      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        // Check if export was cancelled
        if (this.cancelExport$.observed) {
          throw new Error('Export cancelled by user');
        }

        const chunk = transactions.slice(
          i,
          Math.min(i + CHUNK_SIZE, totalRows),
        );

        chunk.forEach(transaction => {
          csvContent += this.transactionToCSVRow(transaction) + '\n';
        });

        // Calculate progress
        const currentRow = Math.min(i + CHUNK_SIZE, totalRows);
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const rowsPerSecond = currentRow / elapsed;
        const remainingRows = totalRows - currentRow;
        const estimatedTimeRemaining = Math.round(
          remainingRows / rowsPerSecond,
        );

        this.progress$.next({
          currentRow,
          totalRows,
          percentage: Math.round((currentRow / totalRows) * 100),
          estimatedTimeRemaining,
          isComplete: currentRow === totalRows,
          isCancelled: false,
        });

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Download the file
      this.downloadCSV(csvContent, filename);

      this.progress$.next({
        currentRow: totalRows,
        totalRows,
        percentage: 100,
        estimatedTimeRemaining: 0,
        isComplete: true,
        isCancelled: false,
      });
    } catch (error) {
      this.progress$.next({
        currentRow: 0,
        totalRows: transactions.length,
        percentage: 0,
        estimatedTimeRemaining: 0,
        isComplete: false,
        isCancelled: true,
      });
      throw error;
    } finally {
      this.isExporting = false;
    }
  }

  cancelExport(): void {
    this.cancelExport$.next();
  }

  private transactionToCSVRow(transaction: any): string {
    const row = [
      new Date(transaction.createdAt).toLocaleString(),
      transaction.id,
      transaction.amount,
      transaction.fee,
      transaction.provider,
      transaction.status,
    ];

    return row
      .map(cell => this.escapeCsvField(String(cell)))
      .join(',');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
```

### Export Progress Dialog

```typescript
// src/components/export-progress-dialog/export-progress-dialog.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CsvExportService, ExportProgress } from '../../services/csv-export.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-export-progress-dialog',
  templateUrl: './export-progress-dialog.component.html',
  styleUrls: ['./export-progress-dialog.component.scss'],
})
export class ExportProgressDialogComponent implements OnInit {
  progress: ExportProgress | null = null;
  isExporting = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { transactions: any[]; filename: string },
    private dialogRef: MatDialogRef<ExportProgressDialogComponent>,
    private csvService: CsvExportService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.startExport();
  }

  private startExport(): void {
    this.isExporting = true;

    // Subscribe to progress updates
    this.csvService.getProgress().subscribe(progress => {
      this.progress = progress;

      if (progress.isComplete) {
        this.isExporting = false;
        this.toastr.success(
          `Export completed: ${this.data.filename}`,
          'Download Started',
        );
        setTimeout(() => this.dialogRef.close(), 2000);
      }
    });

    // Start export
    this.csvService.exportTransactions(
      this.data.transactions,
      this.data.filename,
    ).catch(error => {
      this.isExporting = false;
      this.toastr.error(
        error.message || 'Export failed',
        'Error',
      );
    });
  }

  cancelExport(): void {
    this.csvService.cancelExport();
    this.dialogRef.close();
  }

  getTimeRemainingText(): string {
    if (!this.progress) return '';

    const { estimatedTimeRemaining } = this.progress;
    if (estimatedTimeRemaining < 60) {
      return `~${estimatedTimeRemaining}s remaining`;
    }

    const minutes = Math.round(estimatedTimeRemaining / 60);
    return `~${minutes}m remaining`;
  }
}
```

### Template

```html
<!-- src/components/export-progress-dialog/export-progress-dialog.component.html -->
<h2 mat-dialog-title>Export Transactions</h2>

<mat-dialog-content>
  <div *ngIf="progress" class="export-progress">
    <!-- Progress Bar -->
    <mat-progress-bar 
      mode="determinate" 
      [value]="progress.percentage">
    </mat-progress-bar>

    <!-- Progress Text -->
    <div class="progress-text">
      <span class="progress-percentage">{{ progress.percentage }}%</span>
      <span class="progress-rows">
        {{ progress.currentRow }} of {{ progress.totalRows }} rows
      </span>
    </div>

    <!-- Time Remaining -->
    <div *ngIf="!progress.isComplete" class="time-remaining">
      {{ getTimeRemainingText() }}
    </div>

    <!-- Completion Message -->
    <div *ngIf="progress.isComplete" class="completion-message">
      ✓ Export completed successfully!
    </div>
  </div>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button 
    mat-button 
    (click)="cancelExport()"
    [disabled]="!isExporting">
    {{ isExporting ? 'Cancel' : 'Close' }}
  </button>
</mat-dialog-actions>
```

### Integration with Table

```typescript
// In transaction-table.component.ts
export class TransactionTableComponent {
  constructor(
    private dialog: MatDialog,
  ) {}

  exportToCSV(): void {
    // Show progress dialog
    this.dialog.open(ExportProgressDialogComponent, {
      width: '400px',
      disableClose: true,
      data: {
        transactions: this.transactions,
        filename: `transactions-${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  }
}
```

---

## Testing Requirements

### Unit Tests
- [ ] Pagination service: page navigation, page size changes, state persistence
- [ ] Sort service: column sorting, direction toggling, state persistence
- [ ] CSV export: chunking, progress calculation, time estimation
- [ ] Empty state: type detection, filter state handling

### Integration Tests
- [ ] Pagination with sorting: sort persists across page changes
- [ ] Pagination with filters: page resets on filter change
- [ ] Empty state displays correctly for different scenarios
- [ ] CSV export with large dataset (10,000+ rows)
- [ ] Sort indicator displays correctly

### E2E Tests
- [ ] User can paginate through results
- [ ] User can sort by multiple columns
- [ ] User sees empty state and can clear filters
- [ ] User can export large dataset with progress feedback
- [ ] Page size preference persists across sessions
- [ ] Sort preference persists across sessions

---

## Deployment Checklist
- [ ] Install @angular/material if not present
- [ ] Add pagination service
- [ ] Add sort service
- [ ] Add CSV export service
- [ ] Update transaction table component with pagination
- [ ] Update transaction table component with sorting
- [ ] Add empty state component
- [ ] Add export progress dialog
- [ ] Update API endpoints to support sort/pagination parameters
- [ ] Test all scenarios: no data, filtered, sorted, paginated
- [ ] Verify localStorage persistence works
- [ ] Test keyboard shortcuts (Shift+click for sort)
- [ ] Verify progress bar displays correctly for large exports
- [ ] Test cancel functionality during export
