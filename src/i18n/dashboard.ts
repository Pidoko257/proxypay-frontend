export type DashboardLocale = 'en' | 'es' | 'fr';

export const dashboardMessages: Record<DashboardLocale, {
  eyebrow: string;
  title: string;
  description: string;
  apiReference: string;
  transactions: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  id: string;
  customer: string;
  amount: string;
  status: string;
  noResults: string;
  language: string;
}> = {
  en: {
    eyebrow: 'ProxyPay', title: 'Transaction dashboard', description: 'Search and monitor your recent transactions.',
    apiReference: 'API reference', transactions: 'Transactions', searchLabel: 'Search transactions',
    searchPlaceholder: 'Try: Completed AND Amina, or NOT Failed',
    searchHint: 'Use AND, OR, NOT, and parentheses to combine terms.',
    id: 'ID', customer: 'Customer', amount: 'Amount', status: 'Status', noResults: 'No transactions match this query.', language: 'Language',
  },
  es: {
    eyebrow: 'ProxyPay', title: 'Panel de transacciones', description: 'Busca y supervisa tus transacciones recientes.',
    apiReference: 'Referencia de API', transactions: 'Transacciones', searchLabel: 'Buscar transacciones',
    searchPlaceholder: 'Prueba: Completed AND Amina, o NOT Failed',
    searchHint: 'Usa AND, OR, NOT y paréntesis para combinar términos.',
    id: 'ID', customer: 'Cliente', amount: 'Importe', status: 'Estado', noResults: 'Ninguna transacción coincide con esta búsqueda.', language: 'Idioma',
  },
  fr: {
    eyebrow: 'ProxyPay', title: 'Tableau des transactions', description: 'Recherchez et suivez vos transactions récentes.',
    apiReference: 'Référence API', transactions: 'Transactions', searchLabel: 'Rechercher des transactions',
    searchPlaceholder: 'Essayez : Completed AND Amina, ou NOT Failed',
    searchHint: 'Utilisez AND, OR, NOT et des parenthèses pour combiner les termes.',
    id: 'ID', customer: 'Client', amount: 'Montant', status: 'Statut', noResults: 'Aucune transaction ne correspond à cette recherche.', language: 'Langue',
  },
};
