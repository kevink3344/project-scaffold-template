import { useEffect, useRef, useState } from 'react'
import { Bell, LayoutDashboard, Moon, Settings, Sun, UserRound } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { setAuthToken, clearAuthToken } from '../services/api/client'
import { login as oidcLogin, logout as oidcLogout, getStoredUser, getSessionUser, getAccessToken, type OidcUser } from '../services/auth'
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [notificationsError, setNotificationsError] = useState('')
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const isDarkMode = themeMode === 'dark'
  const notificationsPreview = notifications.slice(0, 3)
  const unreadCount = notifications.filter(item => !item.is_read).length
  const hasUserProfileClaims = Boolean(
    user && (
      (user.email && user.email !== 'authenticated-user')
      || user.given_name
      || user.family_name
      || (user.name && user.name !== 'authenticated-user')
    ),
  )
  const userDisplayName = user
    ? (hasUserProfileClaims ? user.name : 'Signed in user')
    : ''
  const userDisplayEmail = user
    ? (hasUserProfileClaims && user.email ? user.email : 'Profile claims unavailable')
    : ''

  useEffect(() => {
    const token = getAccessToken()
    if (token) setAuthToken(token)
    setNotifications(getCachedNotifications())

    let isMounted = true
    getSessionUser().then(sessionUser => {
      if (isMounted && sessionUser) {
        setUser(sessionUser)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen) return

    function handleDocumentClick(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileMenuOpen])

  function handleLogin() {
    oidcLogin()
  }

  function handleLogout() {
    oidcLogout()
    clearAuthToken()
    setUser(null)
    setIsProfileMenuOpen(false)
  }

  function handleProfileMenuToggle() {
    setIsProfileMenuOpen(prev => !prev)
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
            <div className="user-info" ref={profileMenuRef}>
              <button
                type="button"
                className="icon-btn user-profile-btn"
                aria-label={`Signed in as ${userDisplayName}`}
                title={userDisplayEmail || userDisplayName}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={handleProfileMenuToggle}
              >
                <UserRound aria-hidden="true" />
              </button>

              {isProfileMenuOpen && (
                <div className="profile-menu" role="menu" aria-label="Profile menu">
                  <p className="profile-menu-name">{userDisplayName}</p>
                  <p className="profile-menu-email">{userDisplayEmail}</p>
                  <button type="button" className="btn btn-secondary profile-menu-signout" onClick={handleLogout}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="login-section">
              <button className="btn" onClick={handleLogin}>Login</button>
            </div>
          )}
        </div>
      </header>

      <Outlet />
    </>
  )
}
