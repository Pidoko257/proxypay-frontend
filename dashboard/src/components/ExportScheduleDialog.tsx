import { useEffect, useMemo, useRef, useState } from 'react'
import type { FC, FormEvent, KeyboardEvent } from 'react'
import { AlertCircle, CalendarPlus, Loader, X } from 'lucide-react'
import {
  CreateExportSchedule,
  ExportDeliveryType,
  ExportFrequency,
  ExportSchedule,
  TransactionFilters,
} from '../services/api'
import {
  createDefaultSchedule,
  getAvailableTimezones,
} from '../services/exportSchedule'
import { useExportScheduleStore } from '../stores/exportScheduleStore'
import { ScheduledExportsList } from './ScheduledExportsList'
import '../styles/ScheduledExports.css'

interface ExportScheduleDialogProps {
  isOpen: boolean
  onClose: () => void
  filters?: TransactionFilters
  includeAuditTrail?: boolean
}

interface ScheduleFormValues {
  name: string
  frequency: ExportFrequency
  time: string
  timezone: string
  dayOfWeek: number
  dayOfMonth: number
  deliveryType: ExportDeliveryType
  email: string
  webhookUrl: string
  includeAuditTrail: boolean
  notifyOnCompletion: boolean
  active: boolean
}

const initialValues = (
  filters?: TransactionFilters,
  includeAuditTrail?: boolean
): ScheduleFormValues => {
  const defaults = createDefaultSchedule(filters)
  return {
    name: defaults.name,
    frequency: defaults.frequency,
    time: defaults.time,
    timezone: defaults.timezone,
    dayOfWeek: 1,
    dayOfMonth: 1,
    deliveryType: defaults.delivery.type,
    email: defaults.delivery.email || '',
    webhookUrl: defaults.delivery.webhookUrl || '',
    includeAuditTrail: includeAuditTrail ?? defaults.includeAuditTrail,
    notifyOnCompletion: defaults.notifyOnCompletion,
    active: defaults.active,
  }
}

const formFromSchedule = (schedule: ExportSchedule): ScheduleFormValues => ({
  name: schedule.name || 'Transaction export',
  frequency: schedule.frequency,
  time: schedule.time,
  timezone: schedule.timezone,
  dayOfWeek: schedule.dayOfWeek ?? 1,
  dayOfMonth: schedule.dayOfMonth ?? 1,
  deliveryType: schedule.delivery?.type || 'email',
  email: schedule.delivery?.email || '',
  webhookUrl: schedule.delivery?.webhookUrl || '',
  includeAuditTrail: schedule.includeAuditTrail,
  notifyOnCompletion: schedule.notifyOnCompletion,
  active: schedule.active,
})

export const ExportScheduleDialog: FC<ExportScheduleDialogProps> = ({
  isOpen,
  onClose,
  filters,
  includeAuditTrail,
}) => {
  const {
    schedules,
    loading,
    saving,
    error,
    completionNotification,
    fetchSchedules,
    fetchCompletionNotifications,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    clearError,
    clearCompletionNotification,
  } = useExportScheduleStore()
  const [values, setValues] = useState<ScheduleFormValues>(() =>
    initialValues(filters, includeAuditTrail)
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const timezones = useMemo(() => getAvailableTimezones(), [])

  useEffect(() => {
    if (isOpen) {
      void fetchSchedules()
      setValues(initialValues(filters, includeAuditTrail))
      setEditingId(null)
      setFormError(null)
      setDeleteId(null)
      clearError()
    }
  }, [clearError, fetchSchedules, filters, includeAuditTrail, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    nameInputRef.current?.focus()
    return () => {
      previousFocus?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    void fetchCompletionNotifications()
    const interval = window.setInterval(() => {
      void fetchCompletionNotifications()
    }, 30000)
    return () => window.clearInterval(interval)
  }, [fetchCompletionNotifications, isOpen])

  if (!isOpen) return null

  const updateValue = <K extends keyof ScheduleFormValues>(
    key: K,
    value: ScheduleFormValues[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setValues(initialValues(filters, includeAuditTrail))
    setEditingId(null)
    setFormError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    if (!values.name.trim()) {
      setFormError('Schedule name is required')
      return
    }
    if (!/^\d{2}:\d{2}$/.test(values.time)) {
      setFormError('Choose a valid export time')
      return
    }
    const [hour, minute] = values.time.split(':').map(Number)
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      setFormError('Choose a valid export time')
      return
    }
    if (
      values.frequency === 'weekly' &&
      (!Number.isInteger(values.dayOfWeek) || values.dayOfWeek < 0 || values.dayOfWeek > 6)
    ) {
      setFormError('Choose a valid day of the week')
      return
    }
    if (
      values.frequency === 'monthly' &&
      (!Number.isInteger(values.dayOfMonth) || values.dayOfMonth < 1 || values.dayOfMonth > 31)
    ) {
      setFormError('Choose a day of the month from 1 to 31')
      return
    }
    if (values.deliveryType === 'email' && !values.email.trim()) {
      setFormError('Enter an email address')
      return
    }
    if (values.deliveryType === 'webhook') {
      try {
        const webhookUrl = new URL(values.webhookUrl)
        if (webhookUrl.protocol !== 'https:') throw new Error('Unsupported protocol')
      } catch {
        setFormError('Enter a valid HTTPS webhook URL')
        return
      }
    }

    const payload: CreateExportSchedule = {
      name: values.name.trim(),
      frequency: values.frequency,
      time: values.time,
      timezone: values.timezone,
      dayOfWeek: values.frequency === 'weekly' ? values.dayOfWeek : undefined,
      dayOfMonth: values.frequency === 'monthly' ? values.dayOfMonth : undefined,
      format: 'csv',
      includeAuditTrail: values.includeAuditTrail,
      filters,
      delivery:
        values.deliveryType === 'webhook'
          ? { type: 'webhook', webhookUrl: values.webhookUrl.trim() }
          : { type: 'email', email: values.email.trim() },
      notifyOnCompletion: values.notifyOnCompletion,
      active: values.active,
    }

    const result = editingId
      ? await updateSchedule(editingId, payload)
      : await createSchedule(payload)
    if (result) resetForm()
  }

  const handleEdit = (schedule: ExportSchedule) => {
    setValues(formFromSchedule(schedule))
    setEditingId(schedule.id)
    setFormError(null)
    clearError()
  }

  const handleDelete = async (schedule: ExportSchedule) => {
    if (deleteId !== schedule.id) {
      setDeleteId(schedule.id)
      return
    }
    await deleteSchedule(schedule.id)
    setDeleteId(null)
    if (editingId === schedule.id) resetForm()
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="schedule-dialog-backdrop" role="presentation">
      <div
        className="schedule-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-dialog-heading"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="schedule-dialog-header">
          <div>
            <h2 id="schedule-dialog-heading">
              <CalendarPlus size={20} /> Scheduled exports
            </h2>
            <p>Automatically send transaction CSV files on a schedule.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close scheduled exports">
            <X size={20} />
          </button>
        </div>

        {completionNotification && (
          <div className="schedule-completion-notice" role="status">
            <span>{completionNotification.message}</span>
            <button type="button" onClick={clearCompletionNotification} aria-label="Dismiss completion notification">
              <X size={14} />
            </button>
          </div>
        )}

        {error && (
          <div className="schedule-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" onClick={clearError} aria-label="Dismiss schedule error">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="schedule-dialog-content">
          <form className="schedule-form" onSubmit={handleSubmit}>
            <h3>{editingId ? 'Edit schedule' : 'Create a schedule'}</h3>
            {formError && <p className="schedule-form-error" role="alert">{formError}</p>}

            <label className="schedule-field">
              <span>Name</span>
              <input
                ref={nameInputRef}
                type="text"
                value={values.name}
                onChange={(event) => updateValue('name', event.target.value)}
                required
              />
            </label>

            <div className="schedule-field-row">
              <label className="schedule-field">
                <span>Frequency</span>
                <select
                  value={values.frequency}
                  onChange={(event) =>
                    updateValue('frequency', event.target.value as ExportFrequency)
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="schedule-field">
                <span>Time</span>
                <input
                  type="time"
                  value={values.time}
                  onChange={(event) => updateValue('time', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="schedule-field-row">
              {values.frequency === 'weekly' && (
                <label className="schedule-field">
                  <span>Day of week</span>
                  <select
                    value={values.dayOfWeek}
                    onChange={(event) => updateValue('dayOfWeek', Number(event.target.value))}
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </label>
              )}
              {values.frequency === 'monthly' && (
                <label className="schedule-field">
                  <span>Day of month</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={values.dayOfMonth}
                    onChange={(event) => updateValue('dayOfMonth', Number(event.target.value))}
                  />
                </label>
              )}
              <label className="schedule-field">
                <span>Timezone</span>
                <select
                  value={values.timezone}
                  onChange={(event) => updateValue('timezone', event.target.value)}
                >
                  {timezones.map((timezone) => (
                    <option key={timezone} value={timezone}>{timezone}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="schedule-field">
              <span>Delivery method</span>
              <select
                value={values.deliveryType}
                onChange={(event) =>
                  updateValue('deliveryType', event.target.value as ExportDeliveryType)
                }
              >
                <option value="email">Email</option>
                <option value="webhook">Webhook</option>
              </select>
            </label>

            {values.deliveryType === 'email' ? (
              <label className="schedule-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) => updateValue('email', event.target.value)}
                  placeholder="finance@example.com"
                  required
                />
              </label>
            ) : (
              <label className="schedule-field">
                <span>Webhook URL</span>
                <input
                  type="url"
                  value={values.webhookUrl}
                  onChange={(event) => updateValue('webhookUrl', event.target.value)}
                  placeholder="https://example.com/hooks/proxypay"
                  required
                />
              </label>
            )}

            <div className="schedule-checks">
              <label>
                <input
                  type="checkbox"
                  checked={values.includeAuditTrail}
                  onChange={(event) => updateValue('includeAuditTrail', event.target.checked)}
                />
                <span>Include audit trail</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={values.notifyOnCompletion}
                  onChange={(event) => updateValue('notifyOnCompletion', event.target.checked)}
                />
                <span>Notify when export completes</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={values.active}
                  onChange={(event) => updateValue('active', event.target.checked)}
                />
                <span>Schedule active</span>
              </label>
            </div>

            <div className="schedule-form-actions">
              {editingId && (
                <button type="button" className="schedule-cancel" onClick={resetForm}>
                  Cancel edit
                </button>
              )}
              <button type="submit" className="schedule-save" disabled={saving}>
                {saving ? <Loader size={15} className="spinner" /> : <CalendarPlus size={15} />}
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create schedule'}
              </button>
            </div>
          </form>

          <section className="scheduled-export-section" aria-labelledby="scheduled-export-list-heading">
            <h3 id="scheduled-export-list-heading">Your schedules</h3>
            <ScheduledExportsList
              schedules={schedules}
              loading={loading}
              onEdit={handleEdit}
              onDelete={(schedule) => void handleDelete(schedule)}
            />
            {deleteId && (
              <p className="schedule-delete-confirmation">
                Click delete again to confirm removing this schedule.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default ExportScheduleDialog
