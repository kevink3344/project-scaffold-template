import { useEffect, useState } from 'react'
import { Bell, LayoutDashboard, Moon, Settings, Sun } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { setAuthToken, clearAuthToken } from '../services/api/client'
import { login as oidcLogin, logout as oidcLogout, getStoredUser, getAccessToken, type OidcUser } from '../services/auth'
import type { NotificationRecord } from '../services/api/exampleApi'
import {
  getCachedNotifications,
  loadNotificationsFeed,
  markNotificationAsRead,
} from '../services/api/notificationsStore'

type ThemeMode = 'light' | 'dark'

interface AppLayoutProps {
  themeMode: ThemeMode
  onToggleThemeMode: () => void
}

export default function AppLayout({ themeMode, onToggleThemeMode }: AppLayoutProps) {
  const [user, setUser] = useState<OidcUser | null>(() => getStoredUser())
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [notificationsError, setNotificationsError] = useState('')
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)

  const isDarkMode = themeMode === 'dark'
  const notificationsPreview = notifications.slice(0, 3)
  const unreadCount = notifications.filter(item => !item.is_read).length

  useEffect(() => {
    const token = getAccessToken()
    if (token) setAuthToken(token)
    setNotifications(getCachedNotifications())
  }, [])

  function handleLogin() {
    oidcLogin()
  }

  function handleLogout() {
    oidcLogout()
    clearAuthToken()
    setUser(null)
  }

  async function loadNotifications() {
    setIsNotificationsLoading(true)
    setNotificationsError('')

    try {
      const data = await loadNotificationsFeed()
      setNotifications(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load notifications.'
      setNotificationsError(message)
    } finally {
      setIsNotificationsLoading(false)
    }
  }

  async function handleNotificationsToggle() {
    const nextOpen = !isNotificationsOpen
    setIsNotificationsOpen(nextOpen)

    if (nextOpen && notifications.length === 0 && !isNotificationsLoading) {
      await loadNotifications()
    }
  }

  function handleMarkPreviewItemRead(notificationId: number) {
    const updatedNotifications = markNotificationAsRead(notificationId)
    setNotifications(updatedNotifications)
  }

  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-brand" aria-label="Go to Home">
          <LayoutDashboard aria-hidden="true" />
          <span>Project Scaffold</span>
        </Link>
        <div className="auth-section">
          <div className="header-controls">
            <Link
              to="/settings"
              className="icon-btn"
              aria-label="Settings"
              title="Settings"
            >
              <Settings aria-hidden="true" />
            </Link>
            <div className="notification-menu">
              <button
                type="button"
                className="icon-btn notification-icon-btn"
                aria-label="Notifications"
                title="Notifications"
                onClick={handleNotificationsToggle}
              >
                <Bell aria-hidden="true" />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {isNotificationsOpen && (
                <div className="notification-preview">
                  <div className="notification-preview-header">
                    <h3>Notifications</h3>
                    <Link to="/notifications" onClick={() => setIsNotificationsOpen(false)}>View all</Link>
                  </div>

                  {isNotificationsLoading && <p className="notification-preview-state">Loading...</p>}
                  {notificationsError && <p className="notification-preview-error">{notificationsError}</p>}

                  {!isNotificationsLoading && !notificationsError && notificationsPreview.length === 0 && (
                    <p className="notification-preview-state">No notifications available.</p>
                  )}

                  {!isNotificationsLoading && !notificationsError && notificationsPreview.length > 0 && (
                    <ul className="notification-preview-list">
                      {notificationsPreview.map(item => (
                        <li key={item.id} className={item.is_read ? 'is-read' : 'is-unread'}>
                          <p className="notification-title">{item.title}</p>
                          <p className="notification-message">{item.message}</p>
                          {!item.is_read && (
                            <button
                              type="button"
                              className="notification-action"
                              onClick={() => handleMarkPreviewItemRead(item.id)}
                            >
                              Mark as read
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="icon-btn theme-toggle-btn"
              onClick={onToggleThemeMode}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
          </div>

          {user ? (
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <button className="btn btn-secondary" onClick={handleLogout}>Sign Out</button>
            </div>
          ) : (
            <div className="login-section">
              <button className="btn" onClick={handleLogin}>
                Sign in with Rapid Identity
              </button>
            </div>
          )}
        </div>
      </header>

      <Outlet />
    </>
  )
}
