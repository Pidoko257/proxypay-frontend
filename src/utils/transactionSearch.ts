import type { Transaction } from '../data/transactions';

type Token = { type: 'term' | 'and' | 'or' | 'not' | 'open' | 'close'; value: string };

const tokenize = (query: string): Token[] =>
  query.match(/\(|\)|[^\s()]+/g)?.map((value) => {
    const upper = value.toUpperCase();
    if (upper === 'AND' || upper === 'OR' || upper === 'NOT') return { type: upper.toLowerCase() as Token['type'], value };
    if (value === '(' || value === ')') return { type: value === '(' ? 'open' : 'close', value };
    return { type: 'term', value };
  }) ?? [];

const matchesTerm = (transaction: Transaction, term: string): boolean => {
  const normalized = term.toLowerCase();
  const searchable = `${transaction.id} ${transaction.customer} ${transaction.status} ${transaction.amount}`.toLowerCase();
  return searchable.includes(normalized);
};

export function matchesTransactionQuery(transaction: Transaction, query: string): boolean {
  const tokens = tokenize(query.trim());
  if (tokens.length === 0) return true;
  let position = 0;

  const primary = (): boolean => {
    const token = tokens[position];
    if (!token) return true;
    if (token.type === 'not') {
      position += 1;
      return !primary();
    }
    if (token.type === 'open') {
      position += 1;
      const result = expression();
      if (tokens[position]?.type === 'close') position += 1;
      return result;
    }
    if (token.type === 'term') {
      position += 1;
      return matchesTerm(transaction, token.value);
    }
    return true;
  };

  const conjunction = (): boolean => {
    let result = primary();
    while (tokens[position]?.type === 'and' || (!['or', 'close'].includes(tokens[position]?.type ?? '') && tokens[position])) {
      if (tokens[position]?.type === 'and') position += 1;
      result = primary() && result;
    }
    return result;
  };

  const expression = (): boolean => {
    let result = conjunction();
    while (tokens[position]?.type === 'or') {
      position += 1;
      result = conjunction() || result;
    }
    return result;
  };

  return expression();
}

export function filterTransactions(transactions: Transaction[], query: string): Transaction[] {
  return transactions.filter((transaction) => matchesTransactionQuery(transaction, query));
}
