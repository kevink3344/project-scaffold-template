import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, LayoutDashboard, Library, Menu, Moon, Settings, ShieldCheck, Sun, Upload, UserRound } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { clearAuthToken } from '../services/api/client'
import { getSessionUser, getStoredUser, login as oidcLogin, logout as oidcLogout, type OidcUser } from '../services/auth'

type ThemeMode = 'light' | 'dark'

interface AppLayoutProps {
  themeMode: ThemeMode
  onToggleThemeMode: () => void
}

export default function AppLayout({ themeMode, onToggleThemeMode }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<OidcUser | null>(() => getStoredUser())
  const isDarkMode = themeMode === 'dark'

  useEffect(() => {
    let mounted = true
    getSessionUser().then((sessionUser) => {
      if (mounted) setUser(sessionUser)
    })

    return () => {
      mounted = false
    }
  }, [])

  const navItems = useMemo(() => [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/recent', label: 'Recently Viewed', icon: BookOpenText },
    { to: '/admin/library', label: 'Library', icon: Library },
    { to: '/admin/upload', label: 'Upload', icon: Upload },
    { to: '/admin/compliance', label: 'Compliance', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ], [])

  function handleLogin() {
    void oidcLogin()
  }

  function handleLogout() {
    oidcLogout()
    clearAuthToken()
    setUser(null)
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <motion.aside
          animate={{ width: sidebarCollapsed ? 88 : 260 }}
          transition={{ duration: 0.25 }}
          className="border-r border-slate-200/90 bg-[var(--menu-bg)]"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-3">
              <Link to="/" className="flex items-center gap-2">
                <Library className="h-6 w-6 text-[var(--accent-bg)]" />
                {!sidebarCollapsed && <span className="text-sm font-semibold uppercase tracking-wide">Document Library</span>}
              </Link>
              <button type="button" className="btn-lite" onClick={() => setSidebarCollapsed(prev => !prev)}>
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                )
              })}
            </nav>

            <div className="border-t border-slate-200 p-3 text-xs text-slate-600 dark:text-slate-300">
              {!sidebarCollapsed && <p>Brutalist Enterprise Demo</p>}
            </div>
          </div>
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[var(--header-bg)] px-4 py-3">
            <h1 className="text-lg font-semibold text-[var(--brand-navy)]">Document Library</h1>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-lite" onClick={onToggleThemeMode} aria-label="Toggle theme">
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {user ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-[3px] border border-slate-300 px-2 py-1 text-xs">
                    <UserRound className="h-4 w-4" />
                    <span>{user.name || 'Signed in user'}</span>
                  </div>
                  <button type="button" className="btn-lite" onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <button type="button" className="btn-primary" onClick={handleLogin}>Login</button>
              )}
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
