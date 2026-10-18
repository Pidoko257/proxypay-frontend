import { create } from 'zustand'
import {
  CreateExportSchedule,
  ExportCompletionNotification as ApiExportCompletionNotification,
  ExportSchedule,
  proxyPayAPI,
} from '../services/api'
import { calculateNextRun } from '../services/exportSchedule'

export interface ExportCompletionNotification {
  scheduleId: string
  message: string
  receivedAt: string
}

interface ExportScheduleStore {
  schedules: ExportSchedule[]
  loading: boolean
  saving: boolean
  error: string | null
  completionNotification: ExportCompletionNotification | null
  fetchSchedules: () => Promise<void>
  fetchCompletionNotifications: () => Promise<void>
  createSchedule: (schedule: CreateExportSchedule) => Promise<ExportSchedule | null>
  updateSchedule: (
    id: string,
    schedule: Partial<CreateExportSchedule>
  ) => Promise<ExportSchedule | null>
  deleteSchedule: (id: string) => Promise<void>
  setCompletionNotification: (notification: ExportCompletionNotification) => void
  clearCompletionNotification: () => void
  clearError: () => void
}

const withNextRun = (schedule: ExportSchedule): ExportSchedule => ({
  ...schedule,
  nextRunAt:
    schedule.nextRunAt ||
    (schedule.active
      ? calculateNextRun(schedule)?.toISOString()
      : undefined),
})

export const useExportScheduleStore = create<ExportScheduleStore>((set) => ({
  schedules: [],
  loading: false,
  saving: false,
  error: null,
  completionNotification: null,

  fetchSchedules: async () => {
    set({ loading: true, error: null })
    try {
      const schedules = await proxyPayAPI.getExportSchedules()
      set({ schedules: schedules.map(withNextRun), loading: false })
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch export schedules',
        loading: false,
      })
    }
  },

  fetchCompletionNotifications: async () => {
    try {
      const notifications =
        await proxyPayAPI.getExportCompletionNotifications()
      const latest = [...notifications].sort(
        (first, second) =>
          new Date(second.completedAt).getTime() -
          new Date(first.completedAt).getTime()
      )[0] as ApiExportCompletionNotification | undefined
      if (!latest) return
      set({
        completionNotification: {
          scheduleId: latest.scheduleId,
          message: latest.message,
          receivedAt: latest.completedAt,
        },
      })
    } catch {
      return
    }
  },

  createSchedule: async (schedule) => {
    set({ saving: true, error: null })
    try {
      const created = await proxyPayAPI.createExportSchedule(schedule)
      const normalized = withNextRun(created)
      set((state) => ({ schedules: [...state.schedules, normalized], saving: false }))
      return normalized
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to create export schedule',
        saving: false,
      })
      return null
    }
  },

  updateSchedule: async (id, schedule) => {
    set({ saving: true, error: null })
    try {
      const updated = await proxyPayAPI.updateExportSchedule(id, schedule)
      const normalized = withNextRun(updated)
      set((state) => ({
        schedules: state.schedules.map((current) =>
          current.id === id ? normalized : current
        ),
        saving: false,
      }))
      return normalized
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to update export schedule',
        saving: false,
      })
      return null
    }
  },

  deleteSchedule: async (id) => {
    set({ saving: true, error: null })
    try {
      await proxyPayAPI.deleteExportSchedule(id)
      set((state) => ({
        schedules: state.schedules.filter((schedule) => schedule.id !== id),
        saving: false,
      }))
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to delete export schedule',
        saving: false,
      })
    }
  },

  setCompletionNotification: (notification) =>
    set({ completionNotification: notification }),

  clearCompletionNotification: () => set({ completionNotification: null }),

  clearError: () => set({ error: null }),
}))

export const useScheduledExportsStore = useExportScheduleStore
