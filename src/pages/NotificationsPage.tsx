import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NotificationRecord } from '../services/api/exampleApi'
import {
  getCachedNotifications,
  loadNotificationsFeed,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
} from '../services/api/notificationsStore'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const unreadCount = notifications.filter(item => !item.is_read).length

  useEffect(() => {
    setNotifications(getCachedNotifications())

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const data = await loadNotificationsFeed()
        setNotifications(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load notifications.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  function handleMarkAsRead(notificationId: number) {
    const updatedNotifications = markNotificationAsRead(notificationId)
    setNotifications(updatedNotifications)
  }

  function handleMarkAsUnread(notificationId: number) {
    const updatedNotifications = markNotificationAsUnread(notificationId)
    setNotifications(updatedNotifications)
  }

  function handleMarkAllRead() {
    const updatedNotifications = markAllNotificationsAsRead()
    setNotifications(updatedNotifications)
  }

  return (
    <div className="notifications-page">
      <header className="playground-header">
        <div>
          <h1 className="playground-title">All Notifications</h1>
          <p className="playground-subtitle">Complete feed from notifications API. Unread: {unreadCount}</p>
        </div>
        <div className="notifications-actions">
          <button className="btn btn-secondary" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Mark all read
          </button>
          <Link to="/" className="btn btn-secondary">Back Home</Link>
          <Link to="/api-playground" className="btn">API Playground</Link>
        </div>
      </header>

      {isLoading && <p className="notification-preview-state">Loading notifications...</p>}
      {error && <p className="playground-error">{error}</p>}

      {!isLoading && !error && (
        <div className="playground-table-wrap">
          <table className="playground-users-table notifications-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Message</th>
                <th>Type</th>
                <th>Read</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(notification => (
                <tr key={notification.id} className={notification.is_read ? 'is-read' : 'is-unread'}>
                  <td>{notification.id}</td>
                  <td>{notification.title}</td>
                  <td>{notification.message}</td>
                  <td>{notification.type}</td>
                  <td>{notification.is_read ? 'Yes' : 'No'}</td>
                  <td>{notification.date_created}</td>
                  <td>
                    {notification.is_read ? (
                      <div className="notification-read-actions">
                        <span className="notification-table-read">Read</span>
                        <button
                          type="button"
                          className="notification-table-icon-action"
                          aria-label="Mark as unread"
                          title="Mark as unread"
                          onClick={() => handleMarkAsUnread(notification.id)}
                        >
                          <RotateCcw aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary notification-table-action"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark as read
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
