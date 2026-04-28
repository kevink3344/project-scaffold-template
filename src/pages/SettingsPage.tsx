import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  defaultThemeConfig,
  getFreshnessThresholds,
  getThemeConfig,
  setFreshnessThresholds,
  setThemeConfig,
} from '../services/documentStore'
import { fetchCategories, createCategory, deleteCategory, type CategoryRecord } from '../services/api/categoriesApi'
import { fetchDepartments, createDepartment, updateDepartment, deleteDepartment, type DepartmentRecord } from '../services/api/departmentsApi'
import { fetchDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType, type DocumentTypeRecord } from '../services/api/documentTypesApi'
import { fetchLocations, createLocation, updateLocation, deleteLocation, type LocationRecord } from '../services/api/locationsApi'
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
  created_at?: string
  last_login_at?: string
  categories?: string[]
}

type UserRole = 'admin' | 'user' | 'support' | 'analyst' | 'manager'

interface EditableUserDraft {
  given_name: string
  family_name: string
  email: string
  role: UserRole
}

const ROLE_OPTIONS: UserRole[] = ['user', 'admin', 'support', 'analyst', 'manager']

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

function normalizeUserRole(roleValue: string | undefined): UserRole {
  const normalized = String(roleValue || 'user').trim().toLowerCase()
  if (normalized === 'admin') return 'admin'
  if (normalized === 'support') return 'support'
  if (normalized === 'analyst') return 'analyst'
  if (normalized === 'manager') return 'manager'
  return 'user'
}

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState({ currentWithinDays: 365, reviewSoonWithinDays: 730 })
  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>(defaultThemeConfig)
  const [users, setUsers] = useState<ApiUserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [selectedUser, setSelectedUser] = useState<ApiUserRecord | null>(null)
  const [userDraft, setUserDraft] = useState<EditableUserDraft | null>(null)
  const [userPanelError, setUserPanelError] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentsError, setDepartmentsError] = useState('')
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [creatingDepartment, setCreatingDepartment] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null)
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRecord[]>([])
  const [documentTypesLoading, setDocumentTypesLoading] = useState(true)
  const [documentTypesError, setDocumentTypesError] = useState('')
  const [newDocumentType, setNewDocumentType] = useState({ name: '', description: '' })
  const [creatingDocumentType, setCreatingDocumentType] = useState(false)
  const [editingDocumentType, setEditingDocumentType] = useState<DocumentTypeRecord | null>(null)
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [creatingLocation, setCreatingLocation] = useState(false)
  const [editingLocation, setEditingLocation] = useState<LocationRecord | null>(null)
  const [locationsSyncing, setLocationsSyncing] = useState(false)
  const [locationsMessage, setLocationsMessage] = useState('')

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

    async function loadDepartments() {
      setDepartmentsLoading(true)
      setDepartmentsError('')
      try {
        const data = await fetchDepartments()
        if (!mounted) return
        setDepartments(data)
      } catch (error) {
        if (!mounted) return
        setDepartmentsError(error instanceof Error ? error.message : 'Failed to load departments')
      } finally {
        if (mounted) setDepartmentsLoading(false)
      }
    }

    void loadDepartments()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadCategories() {
      setCategoriesLoading(true)
      setCategoriesError('')
      try {
        const data = await fetchCategories()
        if (!mounted) return
        setCategories(data)
      } catch (error) {
        if (!mounted) return
        setCategoriesError(error instanceof Error ? error.message : 'Failed to load categories')
      } finally {
        if (mounted) setCategoriesLoading(false)
      }
    }

    void loadCategories()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadLocations() {
      setLocationsLoading(true)
      setLocationsError('')
      try {
        const data = await fetchLocations()
        if (!mounted) return
        setLocations(data)
      } catch (error) {
        if (!mounted) return
        setLocationsError(error instanceof Error ? error.message : 'Failed to load locations')
      } finally {
        if (mounted) setLocationsLoading(false)
      }
    }

    void loadLocations()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadDocumentTypes() {
      setDocumentTypesLoading(true)
      setDocumentTypesError('')
      try {
        const data = await fetchDocumentTypes()
        if (!mounted) return
        setDocumentTypes(data)
      } catch (error) {
        if (!mounted) return
        setDocumentTypesError(error instanceof Error ? error.message : 'Failed to load document types')
      } finally {
        if (mounted) setDocumentTypesLoading(false)
      }
    }

    void loadDocumentTypes()
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

  function openUserPanel(user: ApiUserRecord) {
    setSelectedUser(user)
    setUserPanelError('')
    setUserDraft({
      given_name: user.given_name || '',
      family_name: user.family_name || '',
      email: user.email || '',
      role: normalizeUserRole(user.role),
    })
  }

  function closeUserPanel() {
    setSelectedUser(null)
    setUserDraft(null)
    setUserPanelError('')
    setSavingUser(false)
  }

  async function saveUser() {
    if (!selectedUser || !userDraft) return
    setUserPanelError('')
    setSavingUser(true)
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(selectedUser.sub)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userDraft),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error || `Failed to save user (${response.status})`)
      }

      const payload = await response.json() as { user?: ApiUserRecord }
      if (!payload.user) throw new Error('Save succeeded but no user was returned')
      const updatedUser = payload.user

      setUsers(prev => prev.map(user => (user.sub === updatedUser.sub ? updatedUser : user)))
      setSelectedUser(updatedUser)
      setUserDraft({
        given_name: updatedUser.given_name || '',
        family_name: updatedUser.family_name || '',
        email: updatedUser.email || '',
        role: normalizeUserRole(updatedUser.role),
      })
    } catch (error) {
      setUserPanelError(error instanceof Error ? error.message : 'Unable to save user')
    } finally {
      setSavingUser(false)
    }
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

  async function createNewCategory() {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      const newCat = await createCategory(newCategoryName.trim())
      setCategories(prev => [...prev, newCat])
      setNewCategoryName('')
    } catch (error) {
      setCategoriesError(error instanceof Error ? error.message : 'Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  async function removeCategory(id: string) {
    try {
      await deleteCategory(id)
      setCategories(prev => prev.filter(cat => cat.id !== id))
    } catch (error) {
      setCategoriesError(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  async function createNewDepartment() {
    if (!newDepartmentName.trim()) return
    setCreatingDepartment(true)
    setDepartmentsError('')
    try {
      const created = await createDepartment(newDepartmentName.trim())
      setDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewDepartmentName('')
    } catch (error) {
      setDepartmentsError(error instanceof Error ? error.message : 'Failed to create department')
    } finally {
      setCreatingDepartment(false)
    }
  }

  async function updateExistingDepartment() {
    if (!editingDepartment) return
    setDepartmentsError('')
    try {
      const updated = await updateDepartment(editingDepartment.id, editingDepartment.name)
      setDepartments(prev => prev.map(dep => dep.id === updated.id ? updated : dep).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingDepartment(null)
    } catch (error) {
      setDepartmentsError(error instanceof Error ? error.message : 'Failed to update department')
    }
  }

  async function removeDepartment(id: string) {
    setDepartmentsError('')
    try {
      await deleteDepartment(id)
      setDepartments(prev => prev.filter(dep => dep.id !== id))
      if (editingDepartment?.id === id) {
        setEditingDepartment(null)
      }
    } catch (error) {
      setDepartmentsError(error instanceof Error ? error.message : 'Failed to delete department')
    }
  }

  async function createNewLocation() {
    if (!newLocationName.trim()) return
    setCreatingLocation(true)
    setLocationsError('')
    try {
      const created = await createLocation(newLocationName.trim())
      setLocations(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewLocationName('')
    } catch (error) {
      setLocationsError(error instanceof Error ? error.message : 'Failed to create location')
    } finally {
      setCreatingLocation(false)
    }
  }

  async function updateExistingLocation() {
    if (!editingLocation) return
    setLocationsError('')
    try {
      const updated = await updateLocation(editingLocation.id, editingLocation.name)
      setLocations(prev => prev.map(loc => loc.id === updated.id ? updated : loc).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingLocation(null)
    } catch (error) {
      setLocationsError(error instanceof Error ? error.message : 'Failed to update location')
    }
  }

  async function removeLocation(id: number) {
    setLocationsError('')
    try {
      await deleteLocation(id)
      setLocations(prev => prev.filter(loc => loc.id !== id))
      if (editingLocation?.id === id) {
        setEditingLocation(null)
      }
    } catch (error) {
      setLocationsError(error instanceof Error ? error.message : 'Failed to delete location')
    }
  }

  async function createNewDocumentType() {
    if (!newDocumentType.name.trim() || !newDocumentType.description.trim()) return
    setCreatingDocumentType(true)
    try {
      const newType = await createDocumentType(newDocumentType.name.trim(), newDocumentType.description.trim())
      setDocumentTypes(prev => [...prev, newType])
      setNewDocumentType({ name: '', description: '' })
    } catch (error) {
      setDocumentTypesError(error instanceof Error ? error.message : 'Failed to create document type')
    } finally {
      setCreatingDocumentType(false)
    }
  }

  async function updateExistingDocumentType() {
    if (!editingDocumentType) return
    try {
      const updated = await updateDocumentType(editingDocumentType.id, editingDocumentType.name, editingDocumentType.description)
      setDocumentTypes(prev => prev.map(type => type.id === updated.id ? updated : type))
      setEditingDocumentType(null)
    } catch (error) {
      setDocumentTypesError(error instanceof Error ? error.message : 'Failed to update document type')
    }
  }

  async function removeDocumentType(id: string) {
    try {
      await deleteDocumentType(id)
      setDocumentTypes(prev => prev.filter(type => type.id !== id))
    } catch (error) {
      setDocumentTypesError(error instanceof Error ? error.message : 'Failed to delete document type')
    }
  }

  async function syncLocations() {
    setLocationsSyncing(true)
    setLocationsError('')
    setLocationsMessage('')
    try {
      const response = await fetch('/api/locations/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string; details?: string } | null
        throw new Error(payload?.details || payload?.error || `Failed to sync locations (${response.status})`)
      }

      const payload = await response.json() as { synced?: number; total?: number }
      setLocationsMessage(`Successfully synced ${payload.synced ?? 0} location(s) (${payload.total ?? 0} total available)`)
    } catch (error) {
      setLocationsError(error instanceof Error ? error.message : 'Failed to sync locations')
    } finally {
      setLocationsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="card-shell flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Admin Settings</h2>
          <p className="text-sm text-slate-600">All settings are grouped into collapsible sections.</p>
        </div>
      </section>

      <AccordionSection title="Freshness Thresholds">
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

      <AccordionSection title="Compliance Dashboard Link">
        <p className="text-sm text-slate-600">Open the compliance dashboard to review aging documents and category coverage.</p>
        <Link to="/admin/compliance" className="btn-lite inline-flex">Go to Compliance Dashboard</Link>
      </AccordionSection>

      <AccordionSection title={`Manage Locations (${locations.length})`}>
        <p className="text-sm text-slate-600 mb-3">Manage individual locations. You can add, edit, or delete locations, or bulk load them from WCPSS.</p>
        {locationsError && <p className="text-sm font-semibold text-red-700 mb-2">{locationsError}</p>}
        {locationsMessage && <p className="text-sm font-semibold text-green-700 mb-2">{locationsMessage}</p>}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input-shell flex-1"
              placeholder="New location name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={createNewLocation}
              disabled={creatingLocation || !newLocationName.trim()}
            >
              {creatingLocation ? 'Adding...' : 'Add'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-lite"
              onClick={syncLocations}
              disabled={locationsSyncing}
            >
              {locationsSyncing ? 'Loading...' : 'Load Locations from WCPSS'}
            </button>
          </div>
          {locationsLoading && <p className="text-sm text-slate-600">Loading locations...</p>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {locations.map(location => (
              <div key={location.id} className="p-3 border border-slate-300 rounded-[3px]">
                {editingLocation?.id === location.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input-shell"
                      value={editingLocation.name}
                      onChange={(e) => setEditingLocation(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={updateExistingLocation}
                        disabled={!editingLocation.name.trim()}
                      >
                        Save
                      </button>
                      <button type="button" className="btn-lite" onClick={() => setEditingLocation(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{location.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-lite"
                        onClick={() => setEditingLocation(location)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-lite text-red-600"
                        onClick={() => removeLocation(location.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title={`Manage Departments (${departments.length})`}>
        {departmentsLoading && <p className="text-sm text-slate-600">Loading departments...</p>}
        {departmentsError && <p className="text-sm font-semibold text-red-700">{departmentsError}</p>}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input-shell flex-1"
              placeholder="New department name"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={createNewDepartment}
              disabled={creatingDepartment || !newDepartmentName.trim()}
            >
              {creatingDepartment ? 'Creating...' : 'Add'}
            </button>
          </div>
          <div className="space-y-2">
            {departments.map(department => (
              <div key={department.id} className="p-3 border border-slate-300 rounded-[3px]">
                {editingDepartment?.id === department.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input-shell"
                      value={editingDepartment.name}
                      onChange={(e) => setEditingDepartment(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={updateExistingDepartment}
                        disabled={!editingDepartment.name.trim()}
                      >
                        Save
                      </button>
                      <button type="button" className="btn-lite" onClick={() => setEditingDepartment(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{department.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-lite"
                        onClick={() => setEditingDepartment(department)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-lite text-red-600"
                        onClick={() => removeDepartment(department.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title={`Manage Categories (${categories.length})`}>
        {categoriesLoading && <p className="text-sm text-slate-600">Loading categories...</p>}
        {categoriesError && <p className="text-sm font-semibold text-red-700">{categoriesError}</p>}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input-shell flex-1"
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={createNewCategory}
              disabled={creatingCategory || !newCategoryName.trim()}
            >
              {creatingCategory ? 'Creating...' : 'Add'}
            </button>
          </div>
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-2 border border-slate-300 rounded-[3px]">
                <span className="font-medium">{category.name}</span>
                <button
                  type="button"
                  className="btn-lite text-red-600"
                  onClick={() => removeCategory(category.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title={`Manage Document Types (${documentTypes.length})`}>
        {documentTypesLoading && <p className="text-sm text-slate-600">Loading document types...</p>}
        {documentTypesError && <p className="text-sm font-semibold text-red-700">{documentTypesError}</p>}
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              type="text"
              className="input-shell"
              placeholder="Name"
              value={newDocumentType.name}
              onChange={(e) => setNewDocumentType(prev => ({ ...prev, name: e.target.value }))}
            />
            <input
              type="text"
              className="input-shell"
              placeholder="Description"
              value={newDocumentType.description}
              onChange={(e) => setNewDocumentType(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={createNewDocumentType}
            disabled={creatingDocumentType || !newDocumentType.name.trim() || !newDocumentType.description.trim()}
          >
            {creatingDocumentType ? 'Creating...' : 'Add Document Type'}
          </button>
          <div className="space-y-2">
            {documentTypes.map(type => (
              <div key={type.id} className="p-3 border border-slate-300 rounded-[3px]">
                {editingDocumentType?.id === type.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input-shell"
                      value={editingDocumentType.name}
                      onChange={(e) => setEditingDocumentType(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                    <input
                      type="text"
                      className="input-shell"
                      value={editingDocumentType.description}
                      onChange={(e) => setEditingDocumentType(prev => prev ? { ...prev, description: e.target.value } : null)}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary" onClick={updateExistingDocumentType}>Save</button>
                      <button type="button" className="btn-lite" onClick={() => setEditingDocumentType(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{type.name}</h4>
                      <p className="text-sm text-slate-600">{type.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-lite"
                        onClick={() => setEditingDocumentType(type)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-lite text-red-600"
                        onClick={() => removeDocumentType(type.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title={`Manage Users (${users.length})`}>
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
                <tr
                  key={user.sub}
                  className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                  onClick={() => openUserPanel(user)}
                >
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
        <p className="text-xs text-slate-500">Select a user row to open the editable details panel.</p>
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

      <AnimatePresence>
        {selectedUser && userDraft && (
          <>
            <motion.button
              key="overlay"
              type="button"
              aria-label="Close user details panel"
              className="fixed inset-0 z-40 bg-black/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeUserPanel}
            />

            <motion.aside
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-300 bg-white"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold">User Details</h3>
                  <p className="font-mono text-[11px] text-slate-500">{selectedUser.sub}</p>
                </div>
                <button type="button" className="btn-lite" onClick={closeUserPanel}>Close</button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <label className="space-y-1 text-sm font-semibold">
                  <span>First Name</span>
                  <input
                    type="text"
                    className="input-shell"
                    value={userDraft.given_name}
                    onChange={(event) => setUserDraft(prev => prev ? { ...prev, given_name: event.target.value } : prev)}
                  />
                </label>

                <label className="space-y-1 text-sm font-semibold">
                  <span>Last Name</span>
                  <input
                    type="text"
                    className="input-shell"
                    value={userDraft.family_name}
                    onChange={(event) => setUserDraft(prev => prev ? { ...prev, family_name: event.target.value } : prev)}
                  />
                </label>

                <label className="space-y-1 text-sm font-semibold">
                  <span>Email</span>
                  <input
                    type="email"
                    className="input-shell"
                    value={userDraft.email}
                    onChange={(event) => setUserDraft(prev => prev ? { ...prev, email: event.target.value } : prev)}
                  />
                </label>

                <label className="space-y-1 text-sm font-semibold">
                  <span>Role</span>
                  <select
                    className="input-shell"
                    value={userDraft.role}
                    onChange={(event) => {
                      const role = normalizeUserRole(event.target.value)
                      setUserDraft(prev => prev ? { ...prev, role } : prev)
                    }}
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[3px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p>Created: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '-'}</p>
                  <p>Last login: {selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : '-'}</p>
                </div>

                {userPanelError && <p className="text-sm font-semibold text-red-700">{userPanelError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
                <button type="button" className="btn-lite" onClick={closeUserPanel} disabled={savingUser}>Cancel</button>
                <button type="button" className="btn-primary" onClick={saveUser} disabled={savingUser}>
                  {savingUser ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
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
