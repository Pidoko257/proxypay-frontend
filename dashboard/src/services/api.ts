import axios, { AxiosInstance, AxiosError } from 'axios'
import { recordPerformanceMetric } from './performance'
import { useInterceptorLogStore } from '../stores/interceptorLogStore'
import { useApiConfigStore } from '../stores/apiConfigStore'

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
  /** Single provider (legacy, kept for API compat) */
  provider?: string
  /** Multi-select providers for UI filtering (#495) */
  providers?: Array<'vodafone' | 'mtn' | 'airtel'>
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

export interface ScheduledExport {
  id: string
  scheduledFor: string
  status: 'scheduled' | 'processing' | 'ready' | 'failed'
}

export interface DashboardNotification {
  id: string
  title: string
  message: string
  createdAt: string
  read: boolean
  actionUrl?: string
}

/**
 * A single OpenAPI validation problem tied to a specific location in the
 * document via a JSON Pointer (RFC 6901) path (#710).
 */
export interface ValidationIssue {
  /** JSON Pointer path, e.g. `/paths/~1transactions~1{id}/get/parameters/0` */
  path: string
  /** Human-readable description of the problem */
  message: string
  /** Optional severity so callers can distinguish warnings from errors */
  severity?: 'error' | 'warning'
  /** Optional keyword that triggered the failure (e.g. `required`, `type`) */
  keyword?: string
}

/**
 * Structured result of validating an OpenAPI document (#710).
 * `valid` is true only when there are no error-severity issues.
 */
export interface ValidationResult {
  valid: boolean
  /** Concise one-line summary suitable for a banner */
  summary: string
  /** Individual issues with field-level JSON Pointer context */
  issues: ValidationIssue[]
}

/**
 * Escape a single JSON Pointer reference token per RFC 6901.
 */
function escapePointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1')
}

/**
 * Build a JSON Pointer from a sequence of path segments.
 */
export function toJsonPointer(segments: Array<string | number>): string {
  if (segments.length === 0) return ''
  return '/' + segments.map((s) => escapePointerToken(String(s))).join('/')
}

/**
 * Normalize a raw validation error (from a validator or API response) into a
 * structured {@link ValidationIssue} with a JSON Pointer path (#710).
 */
export function normalizeValidationIssue(raw: unknown): ValidationIssue {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const segments = Array.isArray(obj.path)
      ? (obj.path as Array<string | number>)
      : typeof obj.instancePath === 'string'
        ? obj.instancePath.split('/').filter((s) => s.length > 0)
        : typeof obj.path === 'string'
          ? obj.path.split('/').filter((s) => s.length > 0)
          : []
    const message =
      typeof obj.message === 'string' && obj.message.length > 0
        ? obj.message
        : 'Validation failed'
    const issue: ValidationIssue = {
      path: toJsonPointer(segments),
      message,
    }
    if (obj.severity === 'warning' || obj.severity === 'error') {
      issue.severity = obj.severity
    }
    if (typeof obj.keyword === 'string') {
      issue.keyword = obj.keyword
    }
    return issue
  }
  return { path: '', message: String(raw ?? 'Validation failed') }
}

/**
 * Build a concise summary line for a set of validation issues (#710).
 */
export function summarizeValidationIssues(issues: ValidationIssue[]): string {
  const errorCount = issues.filter((i) => i.severity !== 'warning').length
  if (issues.length === 0) return 'Document is valid'
  if (errorCount === 0) {
    return `${issues.length} validation warning${issues.length === 1 ? '' : 's'}`
  }
  return `${errorCount} validation error${errorCount === 1 ? '' : 's'}`
}

/**
 * Parse a validation response payload into a structured {@link ValidationResult}.
 * Falls back to a general failure message when the payload cannot be parsed (#710).
 */
export function parseValidationResult(payload: unknown): ValidationResult {
  try {
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      const rawIssues = Array.isArray(obj.issues)
        ? obj.issues
        : Array.isArray(obj.errors)
          ? obj.errors
          : null
      if (rawIssues) {
        const issues = rawIssues.map(normalizeValidationIssue)
        const valid =
          typeof obj.valid === 'boolean'
            ? obj.valid
            : !issues.some((i) => i.severity !== 'warning')
        return {
          valid,
          summary:
            typeof obj.summary === 'string' && obj.summary.length > 0
              ? obj.summary
              : summarizeValidationIssues(issues),
          issues,
        }
      }
      if (typeof obj.message === 'string' && obj.message.length > 0) {
        return {
          valid: false,
          summary: obj.message,
          issues: [{ path: '', message: obj.message }],
        }
      }
    }
  } catch {
    // fall through to safe fallback below
  }
  return {
    valid: false,
    summary: 'Validation failed: unable to parse validation details',
    issues: [],
  }
}

class ProxyPayAPI {
  private client: AxiosInstance
  private authToken: string | null = null

  constructor(baseURL = '/api') {
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

type Primitive = string | number | boolean

const encode = (value: Primitive): string => encodeURIComponent(String(value))

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const defaultStyle = (location: ParameterLocation): ParameterStyle =>
  location === 'path' || location === 'header' ? 'simple' : 'form'

const defaultExplode = (style: ParameterStyle): boolean => style === 'form'

/**
 * Serialize a single parameter value according to its OpenAPI style/explode
 * metadata. Returns the encoded query-string fragment (without a leading `?`).
 * For path/header/cookie locations the raw (unencoded) value is returned so
 * callers can encode it in the appropriate context.
 */
export function serializeParameter(
  name: string,
  value: unknown,
  options: ParameterSerializationOptions = {}
): string {
  const location = options.location ?? 'query'
  const style = options.style ?? defaultStyle(location)
  const explode = options.explode ?? defaultExplode(style)
  const encodedName = encodeURIComponent(name)

  if (value === undefined || value === null) return ''

  if (Array.isArray(value)) {
    const items = value.map((item) => encode(item as Primitive))
    if (style === 'spaceDelimited') {
      return `${encodedName}=${items.join('%20')}`
    }
    if (style === 'pipeDelimited') {
      return `${encodedName}=${items.join('|')}`
    }
    if (style === 'simple') {
      return items.join(',')
    }
    // form (default for query/cookie)
    if (explode) {
      return items.map((item) => `${encodedName}=${item}`).join('&')
    }
    return `${encodedName}=${items.join(',')}`
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(
      ([, v]) => v !== undefined && v !== null
    )
    if (style === 'deepObject') {
      return entries
        .map(([k, v]) => `${encodedName}%5B${encodeURIComponent(k)}%5D=${encode(v as Primitive)}`)
        .join('&')
    }
    if (style === 'simple') {
      return entries.map(([k, v]) => `${encodeURIComponent(k)},${encode(v as Primitive)}`).join(',')
    }
    // form
    if (explode) {
      return entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encode(v as Primitive)}`)
        .join('&')
    }
    const flat = entries
      .map(([k, v]) => `${encodeURIComponent(k)},${encode(v as Primitive)}`)
      .join(',')
    return `${encodedName}=${flat}`
  }

  return `${encodedName}=${encode(value as Primitive)}`
}

/**
 * Serialize a set of parameters into a query string using each parameter's
 * style/explode metadata. Returns a string without a leading `?`.
 */
export function serializeQueryParameters(
  params: Record<string, unknown>,
  metadata: Record<string, ParameterSerializationOptions> = {}
): string {
  const parts: string[] = []
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const fragment = serializeParameter(name, value, {
      location: 'query',
      ...metadata[name],
    })
    if (fragment) parts.push(fragment)
  }
  return parts.join('&')
}

/**
 * Request body media-type editors (#715).
 *
 * Operations may declare one or more request body media types. The workbench
 * picks a matching editor and constructs the appropriate `BodyInit`:
 *  - `application/json` (and `+json`) → JSON editor → string body
 *  - `multipart/form-data` → key/value editor → `FormData`
 *  - `application/x-www-form-urlencoded` → key/value editor → `URLSearchParams`
 *  - binary (`application/octet-stream`, `image/*`, etc.) → file editor → `Blob`
 *  - `text/*` → plain text editor → string body
 *
 * Unsupported media types are surfaced explicitly so callers never silently
 * send malformed data.
 */
export type BodyEditorKind = 'json' | 'form' | 'urlencoded' | 'binary' | 'text' | 'unsupported'

export interface BodyEditorSelection {
  kind: BodyEditorKind
  /** The media type the editor was selected for */
  mediaType: string
  /** True when the media type is not supported by any editor */
  unsupported: boolean
  /** Human-readable reason when unsupported */
  reason?: string
}

const isJsonMediaType = (mediaType: string): boolean => {
  const base = mediaType.split(';')[0].trim().toLowerCase()
  return base === 'application/json' || base.endsWith('+json')
}

const isBinaryMediaType = (mediaType: string): boolean => {
  const base = mediaType.split(';')[0].trim().toLowerCase()
  if (base === 'application/octet-stream') return true
  if (base.startsWith('image/')) return true
  if (base.startsWith('audio/')) return true
  if (base.startsWith('video/')) return true
  if (base === 'application/pdf') return true
  if (base === 'application/zip') return true
  return false
}

/**
 * Choose the editor kind for a single declared media type.
 */
export function selectBodyEditor(mediaType: string): BodyEditorSelection {
  const base = mediaType.split(';')[0].trim().toLowerCase()
  if (isJsonMediaType(base)) {
    return { kind: 'json', mediaType, unsupported: false }
  }
  if (base === 'multipart/form-data') {
    return { kind: 'form', mediaType, unsupported: false }
  }
  if (base === 'application/x-www-form-urlencoded') {
    return { kind: 'urlencoded', mediaType, unsupported: false }
  }
  if (isBinaryMediaType(base)) {
    return { kind: 'binary', mediaType, unsupported: false }
  }

  async updateExportSchedule(
    id: string,
    schedule: Partial<CreateExportSchedule>
  ): Promise<ExportSchedule> {
    const { data } = await this.cl

/* … truncated 1863 chars — edit only what you need near the top … */
