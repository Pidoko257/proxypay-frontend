import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TransactionTableSkeletonProps {
  /**
   * Number of placeholder rows to render. Defaults to 10.
   */
  rows?: number;
  /**
   * When true, renders a compact retry-loading indicator instead of the
   * full initial skeleton. Used while re-fetching after a failed request
   * so the initial skeleton is not confused with a retry in progress.
   */
  isRetrying?: boolean;
}

const COLUMN_COUNT = 6;

export function TransactionTableSkeleton({
  rows = 10,
  isRetrying = false,
}: TransactionTableSkeletonProps) {
  if (isRetrying) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
      >
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
        <span>Retrying transaction request…</span>
      </div>
    );
  }

  return (
    <Table aria-busy="true" aria-label="Loading transactions">
      <TableHeader>
        <TableRow>
          {Array.from({ length: COLUMN_COUNT }).map((_, index) => (
            <TableHead key={index}>
              <Skeleton className="h-4 w-24" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: COLUMN_COUNT }).map((_, cellIndex) => (
              <TableCell key={cellIndex}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
