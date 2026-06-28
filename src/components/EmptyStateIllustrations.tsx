import React from 'react';

export const TransactionsIllustration: React.FC = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="empty-state-svg"
  >
    <rect x="40" y="40" width="120" height="120" rx="8" fill="#E5E7EB" />
    <rect x="55" y="60" width="90" height="8" rx="4" fill="#9CA3AF" />
    <rect x="55" y="80" width="60" height="8" rx="4" fill="#D1D5DB" />
    <rect x="55" y="100" width="75" height="8" rx="4" fill="#D1D5DB" />
    <rect x="55" y="120" width="50" height="8" rx="4" fill="#D1D5DB" />
    <circle cx="140" cy="140" r="20" fill="#3B82F6" />
    <path d="M135 140L138 143L145 136" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WebhooksIllustration: React.FC = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="empty-state-svg"
  >
    <circle cx="100" cy="100" r="40" fill="#E5E7EB" />
    <path d="M100 60V80M100 120V140M60 100H80M120 100H140" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" />
    <circle cx="100" cy="100" r="15" fill="#8B5CF6" />
    <circle cx="60" cy="60" r="8" fill="#D1D5DB" />
    <circle cx="140" cy="60" r="8" fill="#D1D5DB" />
    <circle cx="60" cy="140" r="8" fill="#D1D5DB" />
    <circle cx="140" cy="140" r="8" fill="#D1D5DB" />
  </svg>
);

export const ApiKeysIllustration: React.FC = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="empty-state-svg"
  >
    <rect x="50" y="70" width="100" height="60" rx="8" fill="#E5E7EB" />
    <circle cx="70" cy="100" r="12" fill="#10B981" />
    <rect x="90" y="90" width="50" height="6" rx="3" fill="#9CA3AF" />
    <rect x="90" y="104" width="35" height="6" rx="3" fill="#D1D5DB" />
    <path d="M100 50L100 70M100 130L100 150" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" />
    <circle cx="100" cy="50" r="6" fill="#D1D5DB" />
    <circle cx="100" cy="150" r="6" fill="#D1D5DB" />
  </svg>
);

export const UsersIllustration: React.FC = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="empty-state-svg"
  >
    <circle cx="100" cy="70" r="25" fill="#E5E7EB" />
    <path d="M60 150C60 125 75 110 100 110C125 110 140 125 140 150" fill="#E5E7EB" />
    <circle cx="100" cy="70" r="15" fill="#F59E0B" />
    <circle cx="60" cy="90" r="12" fill="#D1D5DB" />
    <circle cx="140" cy="90" r="12" fill="#D1D5DB" />
    <circle cx="60" cy="90" r="7" fill="#9CA3AF" />
    <circle cx="140" cy="90" r="7" fill="#9CA3AF" />
  </svg>
);
