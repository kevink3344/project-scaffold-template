import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  defaultThemeConfig,
  getFreshnessThresholds,
  getThemeConfig,
  setFreshnessThresholds,
  setThemeConfig,
} from '../services/documentStore'
import type { ThemeConfig } from '../types/documents'

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

interface ApiUserRecord {
  sub: string
  given_name: string
  family_name: string
  email: string
  role: string
}

interface AuthProfilePayload {
  authenticated: boolean
  user?: {
    sub?: string
    given_name?: string
    family_name?: string
    email?: string
    role?: string
    name?: string
  }
}

function AccordionSection({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="card-shell overflow-hidden p-0">
      <button type="button" className="flex w-full items-center justify-between border-b px-4 py-3 text-left" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} onClick={() => setOpen(prev => !prev)}>
        <span className="font-semibold">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <div className="space-y-3 p-4">{children}</div>
      </motion.div>
    </section>
  )
}

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState({ currentWithinDays: 365, reviewSoonWithinDays: 730 })
  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>(defaultThemeConfig)
  const [users, setUsers] = useState<ApiUserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')

  const paletteRows = useMemo(() => [
    { key: 'appBg', label: 'Main App Background' },
    { key: 'headerBg', label: 'Header Background' },
    { key: 'menuBg', label: 'Menu Background' },
    { key: 'cardBg', label: 'Card Background' },
    { key: 'buttonBg', label: 'Button Background' },
    { key: 'accent', label: 'Accent Color' },
  ] as const, [])

  useEffect(() => {
    let mounted = true

    async function loadSettings() {
      const [fresh, theme] = await Promise.all([getFreshnessThresholds(), getThemeConfig()])
      if (!mounted) return
      setThresholds(fresh)
      setThemeConfigState(theme)
    }

    void loadSettings()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadUsers() {
      setUsersLoading(true)
      setUsersError('')
      try {
        const response = await fetch('/api/users', { credentials: 'include' })
        if (response.ok) {
          const payload = await response.json() as { users?: ApiUserRecord[] }
          if (!mounted) return
          setUsers(Array.isArray(payload.users) ? payload.users : [])
          return
        }

        // Fallback: if users endpoint is unavailable (common when backend is down),
        // still show the currently authenticated user from profile.
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          const profileResponse = await fetch('/api/auth/profile', { credentials: 'include' })
          if (profileResponse.ok) {
            const profile = await profileResponse.json() as AuthProfilePayload
            if (profile.authenticated && profile.user?.sub) {
              if (!mounted) return
              setUsers([{
                sub: profile.user.sub,
                given_name: profile.user.given_name || '',
                family_name: profile.user.family_name || '',
                email: profile.user.email || '',
                role: profile.user.role || 'user',
              }])
              setUsersError('Users API is temporarily unavailable. Showing current signed-in user only.')
              return
            }
          }
        }

        throw new Error(`Failed to load users (${response.status})`)
      } catch (error) {
        if (!mounted) return
        setUsers([])
        const message = error instanceof Error ? error.message : 'Unable to load users'
        if (message.includes('(502)') || message.includes('(503)') || message.includes('(504)')) {
          setUsersError('Users API is unavailable. If running locally, start the backend server with npm run dev:server.')
        } else {
          setUsersError(message)
        }
      } finally {
        if (mounted) setUsersLoading(false)
      }
    }

    void loadUsers()
    return () => {
      mounted = false
    }
  }, [])

  function formatUserName(user: ApiUserRecord): string {
    const name = `${user.given_name || ''} ${user.family_name || ''}`.trim()
    if (name) return name
    if (user.email) return user.email
    return user.sub
  }

  async function saveThresholds() {
    await setFreshnessThresholds(thresholds)
    window.alert('Freshness thresholds saved.')
  }

  async function saveTheme() {
    await setThemeConfig(themeConfig)
    const root = document.documentElement
    root.style.setProperty('--app-bg', themeConfig.light.appBg)
    root.style.setProperty('--header-bg', themeConfig.light.headerBg)
    root.style.setProperty('--menu-bg', themeConfig.light.menuBg)
    root.style.setProperty('--card-bg', themeConfig.light.cardBg)
    root.style.setProperty('--button-bg', themeConfig.light.buttonBg)
    root.style.setProperty('--accent-bg', themeConfig.light.accent)
    window.alert('Theme palette saved.')
  }

  return (
    <div className="space-y-4">
      <section className="card-shell flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Admin Settings</h2>
          <p className="text-sm text-slate-600">All settings are grouped into collapsible sections.</p>
        </div>
      </section>

      <AccordionSection title="Freshness Thresholds" defaultOpen>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold">
            <span>Green = current within X days</span>
            <input
              type="number"
              className="input-shell"
              value={thresholds.currentWithinDays}
              onChange={(event) => setThresholds(prev => ({ ...prev, currentWithinDays: Number(event.target.value) || 0 }))}
            />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            <span>Yellow = review soon within X days</span>
            <input
              type="number"
              className="input-shell"
              value={thresholds.reviewSoonWithinDays}
              onChange={(event) => setThresholds(prev => ({ ...prev, reviewSoonWithinDays: Number(event.target.value) || 0 }))}
            />
          </label>
        </div>
        <button type="button" className="btn-primary" onClick={saveThresholds}>Save Thresholds</button>
      </AccordionSection>

      <AccordionSection title="Compliance Dashboard Link" defaultOpen>
        <p className="text-sm text-slate-600">Open the compliance dashboard to review aging documents and category coverage.</p>
        <Link to="/admin/compliance" className="btn-lite inline-flex">Go to Compliance Dashboard</Link>
      </AccordionSection>

      <AccordionSection title="Manage Users" defaultOpen>
        {usersLoading && <p className="text-sm text-slate-600">Loading users...</p>}
        {usersError && <p className="text-sm font-semibold text-red-700">{usersError}</p>}
        <div className="overflow-x-auto rounded-[3px] border border-slate-300">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Subject ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.sub} className="border-b border-slate-100">
                  <td className="px-3 py-2">{formatUserName(user)}</td>
                  <td className="px-3 py-2">{user.role}</td>
                  <td className="px-3 py-2">{user.email || '-'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{user.sub}</td>
                </tr>
              ))}
              {!usersLoading && !usersError && users.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-600" colSpan={4}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AccordionSection>

      <AccordionSection title="Theme Palette (Light & Dark)">
        <p className="text-sm text-slate-600">Users can theme main app, header, menu, cards, and buttons for each mode.</p>
        <div className="grid gap-4 xl:grid-cols-2">
          <ThemeEditor
            title="Light Theme"
            palette={themeConfig.light}
            rows={paletteRows}
            onChange={(key, value) => setThemeConfigState(prev => ({ ...prev, light: { ...prev.light, [key]: value } }))}
          />
          <ThemeEditor
            title="Dark Theme"
            palette={themeConfig.dark}
            rows={paletteRows}
            onChange={(key, value) => setThemeConfigState(prev => ({ ...prev, dark: { ...prev.dark, [key]: value } }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary" onClick={saveTheme}>Save Theme</button>
          <button type="button" className="btn-lite" onClick={() => setThemeConfigState(defaultThemeConfig)}>Reset</button>
        </div>
      </AccordionSection>
    </div>
  )
}

interface ThemeEditorProps {
  title: string
  palette: ThemeConfig['light']
  rows: ReadonlyArray<{ key: keyof ThemeConfig['light']; label: string }>
  onChange: (key: keyof ThemeConfig['light'], value: string) => void
}

function ThemeEditor({ title, palette, rows, onChange }: ThemeEditorProps) {
  return (
    <article className="rounded-[3px] border border-slate-300 bg-white p-3">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <div className="space-y-2">
        {rows.map(row => (
          <label key={row.key} className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span>{row.label}</span>
            <input type="color" value={palette[row.key]} onChange={(event) => onChange(row.key, event.target.value)} className="h-8 w-14 rounded-[3px] border border-slate-300 p-1" />
          </label>
        ))}
      </div>
    </article>
  )
}
