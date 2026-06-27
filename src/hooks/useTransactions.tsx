import { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from '@docusaurus/router';
import { useRateLimit } from './useRateLimit';
import { useEnvironment } from './useEnvironment';

export type SortField = 'date' | 'amount' | 'status';
export type SortDir = 'asc' | 'desc';

export interface Transaction {
  id: string;
  date: string;        // ISO 8601
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

export interface TransactionsPage {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UseTransactionsResult {
  result: TransactionsPage | null;
  loading: boolean;
  error: string | null;
  page: number;
  sortBy: SortField;
  sortDir: SortDir;
  setPage: (p: number) => void;
  setSort: (field: SortField) => void;
}

const PAGE_SIZE = 10;

function parseParams(search: string): { page: number; sortBy: SortField; sortDir: SortDir } {
  const p = new URLSearchParams(search);
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10) || 1);
  const sortBy = (['date', 'amount', 'status'].includes(p.get('sortBy') ?? '')
    ? p.get('sortBy')
    : 'date') as SortField;
  const sortDir = p.get('sortDir') === 'asc' ? 'asc' : 'desc';
  return { page, sortBy, sortDir };
}

export function useTransactions(): UseTransactionsResult {
  const { search, pathname } = useLocation();
  const history = useHistory();
  const { apiBaseUrl } = useEnvironment();
  const { apiFetch } = useRateLimit();

  const { page, sortBy, sortDir } = parseParams(search);
  const [result, setResult] = useState<TransactionsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = `${apiBaseUrl}/v1/transactions?page=${page}&pageSize=${PAGE_SIZE}&sortBy=${sortBy}&sortDir=${sortDir}`;
    apiFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<TransactionsPage>;
      })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiBaseUrl, page, sortBy, sortDir]);

  const pushParams = useCallback(
    (next: { page?: number; sortBy?: SortField; sortDir?: SortDir }) => {
      const p = new URLSearchParams(search);
      if (next.page !== undefined) p.set('page', String(next.page));
      if (next.sortBy !== undefined) p.set('sortBy', next.sortBy);
      if (next.sortDir !== undefined) p.set('sortDir', next.sortDir);
      history.push({ pathname, search: p.toString() });
    },
    [search, pathname, history],
  );

  const setPage = useCallback((p: number) => pushParams({ page: p }), [pushParams]);

  const setSort = useCallback(
    (field: SortField) => {
      const nextDir: SortDir =
        field === sortBy ? (sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
      pushParams({ page: 1, sortBy: field, sortDir: nextDir });
    },
    [sortBy, sortDir, pushParams],
  );

  return { result, loading, error, page, sortBy, sortDir, setPage, setSort };
}
