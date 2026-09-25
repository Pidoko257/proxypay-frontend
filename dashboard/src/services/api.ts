import axios, { AxiosInstance } from 'axios'

// Types for API responses
export interface Transaction {
  id: string
  reference: string
  stellarHash: string
  mobileMoneyReference: string
  amount: number
  fee: number
  feeBreakdown: {
    platformFee: number
    networkFee: number
    providerFee: number
  }
  status: 'pending' | 'settled' | 'failed'
  provider: 'vodafone' | 'mtn' | 'airtel'
  timestamp: string
  settledAt?: string
  failureReason?: string
  auditTrail: AuditEvent[]
}

export interface AuditEvent {
  timestamp: string
  event: string
  details: string
  actor: string
}

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  status?: string
  provider?: string
  limit?: number
  offset?: number
}

export interface NotificationSettings {
  eventType: string
  emailEnabled: boolean
  webhookEnabled: boolean
}

export interface NotificationConfig {
  settings: NotificationSettings[]
}

class ProxyPayAPI {
  private client: AxiosInstance

  constructor(baseURL = '/api') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }

  // Transactions API
  async getTransactions(filters: TransactionFilters): Promise<{
    data: Transaction[]
    total: number
  }> {
    const { data } = await this.client.get('/transactions', { params: filters })
    return data
  }

  async getTransactionDetail(id: string): Promise<Transaction> {
    const { data } = await this.client.get(`/transactions/${id}`)
    return data
  }

  // Notification Settings API
  async getNotificationSettings(): Promise<NotificationConfig> {
    const { data } = await this.client.get('/notifications/settings')
    return data
  }

  async updateNotificationSetting(
    eventType: string,
    emailEnabled: boolean,
    webhookEnabled: boolean
  ): Promise<NotificationSettings> {
    const { data } = await this.client.put(
      `/notifications/settings/${eventType}`,
      {
        emailEnabled,
        webhookEnabled,
      }
    )
    return data
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const { data } = await this.client.get('/health')
      return data.status === 'ok'
    } catch {
      return false
    }
  }
}

export const proxyPayAPI = new ProxyPayAPI()
