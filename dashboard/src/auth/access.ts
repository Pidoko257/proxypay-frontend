export type DashboardRole = 'admin' | 'analyst' | 'viewer'
export type DashboardFeature = 'transactions' | 'transaction-export' | 'notification-settings'

const featureRoles: Record<DashboardFeature, DashboardRole[]> = {
  transactions: ['admin', 'analyst', 'viewer'],
  'transaction-export': ['admin', 'analyst'],
  'notification-settings': ['admin'],
}

export function getCurrentRole(): DashboardRole {
  const rawUser = localStorage.getItem('auth_user')
  if (!rawUser) return 'viewer'

  try {
    const user = JSON.parse(rawUser) as { role?: string }
    return user.role === 'admin' || user.role === 'analyst' || user.role === 'viewer'
      ? user.role
      : 'viewer'
  } catch {
    return 'viewer'
  }
}

export function canAccess(feature: DashboardFeature, role = getCurrentRole()): boolean {
  return featureRoles[feature].includes(role)
}
