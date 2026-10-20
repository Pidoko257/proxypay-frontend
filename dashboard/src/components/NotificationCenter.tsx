import React, { useEffect, useState } from 'react'
import { Bell, Check, RefreshCw } from 'lucide-react'
import { useNotificationStore } from '../stores/notificationStore'
import { getSafeNotificationUrl } from '../utils/safeNavigation'

const SPEC_UPDATE_TITLE = 'Specification updated'

const isSpecUpdateNotification = (title: string): boolean =>
  title.toLowerCase().includes('spec') && title.toLowerCase().includes('update')

export const NotificationCenter: React.FC = () => {
  const { notifications, fetchNotifications, markNotificationRead, bulkMarkRead } =
    useNotificationStore()
  const [reloadStatus, setReloadStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
    const interval = window.setInterval(fetchNotifications, 30000)
    return () => window.clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter((notification) => !notification.read).length
  const unreadNotifications = notifications.filter((notification) => !notification.read)

  const handleMarkAllAsRead = async () => {
    const unreadIds = unreadNotifications.map((n) => n.id)
    if (unreadIds.length > 0) {
      await bulkMarkRead(unreadIds)
    }
  }

  const handleReloadSpec = (notificationId: string) => {
    const previousHash = window.location.hash
    const previousEndpoint = previousHash.startsWith('#/') ? previousHash.slice(2) : ''

    markNotificationRead(notificationId)
    window.location.reload()

    // After reload, restore the endpoint if it still exists in the refreshed spec.
    window.setTimeout(() => {
      if (!previousEndpoint) {
        return
      }
      const endpointExists = document.querySelector(
        `[data-endpoint="${CSS.escape(previousEndpoint)}"]`
      )
      if (endpointExists) {
        window.location.hash = previousHash
        setReloadStatus(`Restored endpoint: ${previousEndpoint}`)
      } else {
        setReloadStatus(
          `Previously selected endpoint was removed: ${previousEndpoint}`
        )
      }
    }, 0)
  }

  return (
    <details className="notification-center">
      <summary aria-label={`${unreadCount} unread notifications`}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </summary>
      <div className="notification-popover">
        <h2>Notifications</h2>
        {reloadStatus && <p className="notification-status">{reloadStatus}</p>}
        {notifications.length === 0 ? (
          <p className="notification-empty">No notifications</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? '' : 'unread'}`}
            >
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                {notification.actionUrl &&
                  getSafeNotificationUrl(notification.actionUrl) && (
                  <a
                    href={getSafeNotificationUrl(notification.actionUrl) ?? '#'}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    Open export
                  </a>
                )}
                {isSpecUpdateNotification(notification.title) && (
                  <button
                    className="notification-reload"
                    aria-label="Reload specification"
                    onClick={() => handleReloadSpec(notification.id)}
                  >
                    <RefreshCw size={16} /> Reload spec
                  </button>
                )}
              </div>
              {!notification.read && (
                <button
                  aria-label="Mark notification as read"
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </details>
  )
}
