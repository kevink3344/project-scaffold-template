import { useEffect, useMemo, useState } from 'react'
import { Bell, BookOpenText, ChevronLeft, LayoutDashboard, Library, LogOut, Menu, Moon, Settings, ShieldCheck, Sun, Upload, LogIn, User } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { clearAuthToken } from '../services/api/client'
import { getSessionUser, getStoredUser, login as oidcLogin, logout as oidcLogout, type OidcUser } from '../services/auth'
import { getReminderNotifications } from '../services/documentStore'
import type { ReminderNotification } from '../types/documents'

type ThemeMode = 'light' | 'dark'

interface AppLayoutProps {
  themeMode: ThemeMode
  onToggleThemeMode: () => void
}

export default function AppLayout({ themeMode, onToggleThemeMode }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<ReminderNotification[]>([])
  const [user, setUser] = useState<OidcUser | null>(() => getStoredUser())
  const isDarkMode = themeMode === 'dark'
  const userDisplayName = user?.name || 'Signed in user'
  const userDisplayEmail = user?.email || 'No email provided'
  const userRole = String(user?.role || 'user')

  function getUserInitials(currentUser: OidcUser | null): string {
    if (!currentUser) return 'SU'
    const candidateName = currentUser.name || [currentUser.given_name, currentUser.family_name].filter(Boolean).join(' ')
    const tokens = candidateName
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean)
    if (tokens.length >= 2) {
      return `${tokens[0].charAt(0)}${tokens[1].charAt(0)}`.toUpperCase()
    }
    if (tokens.length === 1 && tokens[0].length > 0) {
      return tokens[0].slice(0, 2).toUpperCase()
    }
    if (currentUser.email) {
      return currentUser.email.slice(0, 2).toUpperCase()
    }
    return 'SU'
  }

  const userInitials = getUserInitials(user)

  useEffect(() => {
    let mounted = true
    getSessionUser().then((sessionUser) => {
      if (mounted) setUser(sessionUser)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadNotifications() {
      const items = await getReminderNotifications()
      if (mounted) setNotifications(items)
    }
    void loadNotifications()
    return () => {
      mounted = false
    }
  }, [])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMobileMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navItems = useMemo(() => [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/recent', label: 'Recently Viewed', icon: BookOpenText },
    { to: '/admin/library', label: 'Library', icon: Library },
    { to: '/admin/upload', label: 'Upload', icon: Upload },
    { to: '/admin/compliance', label: 'Compliance', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ], [])

  function handleLogin() { void oidcLogin() }

  function handleLogout() {
    oidcLogout()
    clearAuthToken()
    setUser(null)
  }

  function closeMobileMenu() { setMobileMenuOpen(false) }

  const sidebarWidth = sidebarCollapsed ? 88 : 260
  const notificationPreview = notifications.slice(0, 3)

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)', color: 'var(--text-primary)' }}>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-screen">

        {/* ── Sidebar ───────────────────────────────────────── */}
        <aside
          className={[
            'flex flex-col flex-shrink-0 border-r z-50',
            /* mobile: fixed overlay; desktop: in-flow */
            'fixed inset-y-0 left-0',
            'md:relative md:translate-x-0',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          ].join(' ')}
          style={{
            width: sidebarWidth,
            background: 'var(--menu-bg)',
            borderColor: 'var(--border-color)',
            transition: 'width 0.25s ease, transform 0.25s ease',
          }}
        >
          {/* Sidebar header */}
          <div
            className="flex items-center justify-between p-3 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Link
              to="/"
              className="flex items-center gap-2 min-w-0"
              onClick={closeMobileMenu}
            >
              <Library className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--accent-bg)' }} />
              {!sidebarCollapsed && (
                <span
                  className="text-sm font-semibold uppercase tracking-wide truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Doc Library
                </span>
              )}
            </Link>
            {/* Chevron close — only rendered when mobile menu is open */}
            {mobileMenuOpen && (
              <button
                type="button"
                className="btn-lite flex-shrink-0"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Nav links */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>

          {/* Sidebar footer */}
          <div
            className="p-3 text-xs border-t flex-shrink-0"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}
          >
            {!sidebarCollapsed && <p>Document Library</p>}
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header
            className="flex items-center justify-between gap-3 border-b px-4 py-3 flex-shrink-0"
            style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Single toggle: opens sidebar on mobile, collapses on desktop */}
              <button
                type="button"
                className="btn-lite"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileMenuOpen(true)
                  } else {
                    setSidebarCollapsed(prev => !prev)
                  }
                }}
                aria-label="Toggle sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <h1
                className="text-base sm:text-lg font-semibold truncate"
                style={{ color: 'var(--brand-navy)' }}
              >
                Document Library
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <button
                  type="button"
                  className="btn-lite relative"
                  onClick={() => setNotificationsOpen(prev => !prev)}
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-[3px] border p-3 shadow-sm"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border-muted)' }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Notifications</p>
                      <Link to="/notifications" className="text-xs font-semibold" style={{ color: 'var(--accent-bg)' }} onClick={() => setNotificationsOpen(false)}>
                        View all
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {notificationPreview.length === 0 && (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No reminders.</p>
                      )}

                      {notificationPreview.map((notification) => (
                        <Link
                          key={notification.id}
                          to={`/documents/${notification.document_id}`}
                          className="block rounded-[3px] border p-2"
                          style={{ borderColor: 'var(--border-color)' }}
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <p className="text-sm font-semibold">{notification.title}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{notification.document_name}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-lite"
                onClick={onToggleThemeMode}
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {user ? (
                <>
                  <div className="group relative hidden sm:block">
                    <div
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] border text-sm font-bold"
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                    >
                      <span aria-hidden="true">{userInitials}</span>
                    </div>
                    <div
                      className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden min-w-[220px] rounded-[3px] border px-3 py-2 text-left text-xs group-hover:block"
                      style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--border-muted)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <p className="font-semibold">{userDisplayName}</p>
                      <p style={{ color: 'var(--text-secondary)' }}>{userDisplayEmail}</p>
                      <p style={{ color: 'var(--text-secondary)' }}>{userRole}</p>
                    </div>
                  </div>
                  <button type="button" className="btn-lite" onClick={handleLogout} aria-label="Logout" title="Logout">
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button type="button" className="btn-lite" onClick={handleLogin} aria-label="Login" title="Login">
                  <User className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="min-w-0 flex-1 p-4 md:p-6">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  )
}
