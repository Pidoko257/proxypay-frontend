import axios, { AxiosInstance } from 'axios'

export type TransactionStatus =
  | 'pending'
  | 'settled'
  | 'failed'
  | 'processing'
  | 'cancelled'
  | 'refunded'
  | 'duplicate'
  | (string & {})

export interface StatusTransition {
  id?: string
  fromStatus?: TransactionStatus | null
  toStatus: TransactionStatus
  timestamp: string
  actor?: string
  reason?: string
  details?: string
}

export interface AuditEvent {
  timestamp: string
  event: string
  details: string
  actor: string
  fromStatus?: TransactionStatus | null
  toStatus?: TransactionStatus
  reason?: string
}

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
  status: TransactionStatus
  provider: 'vodafone' | 'mtn' | 'airtel'
  timestamp: string
  settledAt?: string
  failureReason?: string
  auditTrail: AuditEvent[]
  statusHistory?: StatusTransition[]
  statusChanges?: StatusTransition[]
  duplicateOf?: string
  isDuplicate?: boolean
  mergedIntoId?: string
}

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  status?: string
  provider?: string
  limit?: number
  offset?: number
}

export type DuplicateMatchReason =
  | 'stellarHash'
  | 'mobileMoneyReference'
  | 'reference'
  | 'transactionFingerprint'
  | 'manual'

export interface DuplicateTransactionGroup {
  id: string
  transactionIds: string[]
  canonicalId: string
  transactions: Transaction[]
  reason: DuplicateMatchReason
  confidence: number
  markedAsDuplicate?: boolean
}

export interface DuplicateMarkRequest {
  transactionIds: string[]
  duplicateOfId: string
  reason?: string
}

export interface MergeTransactionsRequest {
  canonicalId: string
  duplicateIds: string[]
  actor?: string
  reason?: string
}

export type ExportFrequency = 'daily' | 'weekly' | 'monthly'
export type ExportDeliveryType = 'email' | 'webhook'
export type ExportFormat = 'csv'

export interface ExportDelivery {
  type: ExportDeliveryType
  email?: string
  webhookUrl?: string
}

export interface ExportSchedule {
  id: string
  name: string
  frequency: ExportFrequency
  time: string
  timezone: string
  dayOfWeek?: number
  dayOfMonth?: number
  format: ExportFormat
  includeAuditTrail: boolean
  filters?: TransactionFilters
  delivery: ExportDelivery
  notifyOnCompletion: boolean
  active: boolean
  nextRunAt?: string
  lastRunAt?: string
  createdAt?: string
  updatedAt?: string
}

export type CreateExportSchedule = Omit<ExportSchedule, 'id' | 'nextRunAt' | 'lastRunAt' | 'createdAt' | 'updatedAt'> & {
  id?: string
  nextRunAt?: string
  lastRunAt?: string
}

export interface ExportCompletionNotification {
  id?: string
  scheduleId: string
  message: string
  completedAt: string
}

export interface NotificationSettings {
  eventType: string
  emailEnabled: boolean
  webhookEnabled: boolean
}

export interface NotificationConfig {
  settings: NotificationSettings[]
}

type ApiPayload<T> = T | { data: T }

class ProxyPayAPI {
  private client: AxiosInstance

  constructor(baseURL = '/api') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const token = localStorage.getItem('auth_token')
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }

  private unwrap<T>(payload: ApiPayload<T>): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data
    }
    return payload as T
  }

  async getTransactions(filters: TransactionFilters): Promise<{
    data: Transaction[]
    total: number
  }> {
    const { data } = await this.client.get('/transactions', { params: filters })
    return data
  }

  async getTransactionDetail(id: string): Promise<Transaction> {
    const { data } = await this.client.get(`/transactions/${encodeURIComponent(id)}`)
    return this.unwrap<Transaction>(data)
  }

  async getStatusHistory(id: string): Promise<StatusTransition[]> {
    const { data } = await this.client.get(
      `/transactions/${encodeURIComponent(id)}/status-history`
    )
    return this.unwrap<StatusTransition[]>(data) || []
  }

  async getDuplicateTransactions(
    filters?: TransactionFilters
  ): Promise<DuplicateTransactionGroup[]> {
    const { data } = await this.client.get('/transactions/duplicates', {
      params: filters,
    })
    return this.unwrap<DuplicateTransactionGroup[]>(data) || []
  }

  getDuplicateCandidates(
    filters?: TransactionFilters
  ): Promise<DuplicateTransactionGroup[]> {
    return this.getDuplicateTransactions(filters)
  }

  async markTransactionsAsDuplicates(
    request: DuplicateMarkRequest
  ): Promise<DuplicateTransactionGroup | DuplicateTransactionGroup[]> {
    const { data } = await this.client.post('/transactions/duplicates/mark', request)
    return this.unwrap<DuplicateTransactionGroup | DuplicateTransactionGroup[]>(data)
  }

  markDuplicateTransactions(
    request: DuplicateMarkRequest
  ): Promise<DuplicateTransactionGroup | DuplicateTransactionGroup[]> {
    return this.markTransactionsAsDuplicates(request)
  }

  async mergeTransactions(
    canonicalId: string,
    duplicateIds: string[],
    metadata?: Pick<MergeTransactionsRequest, 'actor' | 'reason'>
  ): Promise<Transaction> {
    const { data } = await this.client.post('/transactions/merge', {
      canonicalId,
      duplicateIds,
      ...metadata,
    })
    return this.unwrap<Transaction>(data)
  }

  mergeDuplicateTransactions(
    canonicalId: string,
    duplicateIds: string[]
  ): Promise<Transaction> {
    return this.mergeTransactions(canonicalId, duplicateIds)
  }

  async getExportSchedules(): Promise<ExportSchedule[]> {
    const { data } = await this.client.get('/transactions/exports/schedules')
    return this.unwrap<ExportSchedule[]>(data) || []
  }

  async createExportSchedule(
    schedule: CreateExportSchedule
  ): Promise<ExportSchedule> {
    const { data } = await this.client.post(
      '/transactions/exports/schedules',
      schedule
    )
    return this.unwrap<ExportSchedule>(data)
  }

  async updateExportSchedule(
    id: string,
    schedule: Partial<CreateExportSchedule>
  ): Promise<ExportSchedule> {
    const { data } = await this.client.patch(
      `/transactions/exports/schedules/${encodeURIComponent(id)}`,
      schedule
    )
    return this.unwrap<ExportSchedule>(data)
  }

  async deleteExportSchedule(id: string): Promise<void> {
    await this.client.delete(
      `/transactions/exports/schedules/${encodeURIComponent(id)}`
    )
  }

  async getExportCompletionNotifications(): Promise<ExportCompletionNotification[]> {
    const { data } = await this.client.get(
      '/transactions/exports/notifications'
    )
    return this.unwrap<ExportCompletionNotification[]>(data) || []
  }

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
