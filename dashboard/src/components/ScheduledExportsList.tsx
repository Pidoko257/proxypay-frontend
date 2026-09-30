import { format } from 'date-fns'
import { CalendarClock, Edit3, Mail, Trash2, Webhook } from 'lucide-react'
import { ExportSchedule } from '../services/api'
import { formatNextRun, frequencyLabel } from '../services/exportSchedule'
import type { FC } from 'react'
import '../styles/ScheduledExports.css'

export interface ScheduledExportsListProps {
  schedules: ExportSchedule[]
  loading?: boolean
  onEdit: (schedule: ExportSchedule) => void
  onDelete: (schedule: ExportSchedule) => void
}

const deliveryLabel = (schedule: ExportSchedule): string => {
  if (schedule.delivery?.type === 'webhook') return 'Webhook'
  return schedule.delivery?.email || 'Email not configured'
}

export const ScheduledExportsList: FC<ScheduledExportsListProps> = ({
  schedules,
  loading = false,
  onEdit,
  onDelete,
}) => {
  if (loading && schedules.length === 0) {
    return <p className="scheduled-exports-empty">Loading scheduled exports...</p>
  }

  if (schedules.length === 0) {
    return <p className="scheduled-exports-empty">No scheduled exports yet.</p>
  }

  return (
    <div className="scheduled-exports-list" data-testid="scheduled-exports-list">
      {schedules.map((schedule) => (
        <article key={schedule.id} className={`scheduled-export ${schedule.active ? '' : 'inactive'}`}>
          <div className="scheduled-export-main">
            <div className="scheduled-export-title">
              <CalendarClock size={16} aria-hidden="true" />
              <strong>{schedule.name || 'Transaction export'}</strong>
              <span className="schedule-frequency">{frequencyLabel(schedule.frequency)}</span>
            </div>
            <div className="scheduled-export-time">
              {schedule.active ? `Next run: ${formatNextRun(schedule)}` : 'Paused'}
            </div>
            <div className="scheduled-export-delivery">
              {schedule.delivery?.type === 'webhook' ? (
                <Webhook size={13} aria-hidden="true" />
              ) : (
                <Mail size={13} aria-hidden="true" />
              )}
              <span>{deliveryLabel(schedule)}</span>
              <span>· {schedule.time} {schedule.timezone}</span>
            </div>
          </div>
          <div className="scheduled-export-actions">
            <button type="button" onClick={() => onEdit(schedule)} aria-label={`Edit ${schedule.name}`}>
              <Edit3 size={15} />
            </button>
            <button type="button" onClick={() => onDelete(schedule)} aria-label={`Delete ${schedule.name}`}>
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

export const formatScheduleDate = (timestamp?: string): string => {
  if (!timestamp) return 'Not scheduled'
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? timestamp : format(date, 'PPpp')
}

export default ScheduledExportsList
