import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getTeamsExample, getUsersExample, type TeamRecord, type UserRecord } from '../services/api/exampleApi'

const USERS_CACHE_KEY = 'settings-users-v1'
const TEAMS_CACHE_KEY = 'settings-teams-v1'

interface UserFormState {
  name: string
  email: string
  role: string
  teamSubscriptions: string[]
}

interface TeamFormState {
  name: string
  description: string
}

function readCache<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeUsers(users: UserRecord[]): UserRecord[] {
  return users.map(user => ({
    ...user,
    team_subscriptions: Array.isArray(user.team_subscriptions) ? user.team_subscriptions : [],
  }))
}

export default function SettingsPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isUsersOpen, setIsUsersOpen] = useState(true)
  const [isTeamsOpen, setIsTeamsOpen] = useState(true)

  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)

  const [userForm, setUserForm] = useState<UserFormState>({
    name: '',
    email: '',
    role: '',
    teamSubscriptions: [],
  })
  const [teamForm, setTeamForm] = useState<TeamFormState>({ name: '', description: '' })

  const [usersError, setUsersError] = useState('')
  const [teamsError, setTeamsError] = useState('')

  useEffect(() => {
    async function loadSettingsData() {
      setIsLoading(true)
      setError('')

      const cachedUsers = normalizeUsers(readCache<UserRecord>(USERS_CACHE_KEY))
      const cachedTeams = readCache<TeamRecord>(TEAMS_CACHE_KEY)

      if (cachedUsers.length > 0 || cachedTeams.length > 0) {
        setUsers(cachedUsers)
        setTeams(cachedTeams)
        setIsLoading(false)
        return
      }

      try {
        const [usersResponse, teamsResponse] = await Promise.all([
          getUsersExample(),
          getTeamsExample(),
        ])

        const normalizedUsers = normalizeUsers(usersResponse.users)
        setUsers(normalizedUsers)
        setTeams(teamsResponse.teams)

        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(normalizedUsers))
        localStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify(teamsResponse.teams))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load settings data.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettingsData()
  }, [])

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.id - b.id), [users])
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.id - b.id), [teams])

  function persistUsers(nextUsers: UserRecord[]) {
    setUsers(nextUsers)
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(nextUsers))
  }

  function persistTeams(nextTeams: TeamRecord[]) {
    setTeams(nextTeams)
    localStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify(nextTeams))
  }

  function resetUserForm() {
    setUserForm({ name: '', email: '', role: '', teamSubscriptions: [] })
    setEditingUserId(null)
  }

  function resetTeamForm() {
    setTeamForm({ name: '', description: '' })
    setEditingTeamId(null)
  }

  function getUserTeamLabels(user: UserRecord): string {
    if (!user.team_subscriptions.length) {
      return 'None'
    }

    return user.team_subscriptions
      .map(teamId => sortedTeams.find(team => team.id === teamId)?.name ?? `#${teamId}`)
      .join(', ')
  }

  function handleSubmitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUsersError('')

    const name = userForm.name.trim()
    const email = userForm.email.trim()
    const role = userForm.role.trim()
    const selectedTeamIds = userForm.teamSubscriptions.map(value => Number(value))

    if (!name || !email || !role) {
      setUsersError('Name, email, and role are required.')
      return
    }

    if (selectedTeamIds.some(teamId => !sortedTeams.some(team => team.id === teamId))) {
      setUsersError('Team Subscription contains invalid team ids.')
      return
    }

    if (editingUserId !== null) {
      const updatedUsers = users.map(user => (
        user.id === editingUserId
          ? {
            ...user,
            name,
            email,
            role,
            team_subscriptions: selectedTeamIds,
            date_modified: nowIso(),
          }
          : user
      ))
      persistUsers(updatedUsers)
      resetUserForm()
      return
    }

    const nextId = users.length === 0 ? 1 : Math.max(...users.map(user => user.id)) + 1
    const timestamp = nowIso()

    const nextUser: UserRecord = {
      id: nextId,
      name,
      email,
      role,
      date_created: timestamp,
      date_modified: timestamp,
      team_subscriptions: selectedTeamIds,
    }

    persistUsers([...users, nextUser])
    resetUserForm()
  }

  function handleEditUser(user: UserRecord) {
    setUsersError('')
    setEditingUserId(user.id)
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      teamSubscriptions: user.team_subscriptions.map(String),
    })
  }

  function handleDeleteUser(userId: number) {
    setUsersError('')

    const updatedUsers = users.filter(user => user.id !== userId)
    persistUsers(updatedUsers)

    if (editingUserId === userId) {
      resetUserForm()
    }
  }

  function handleSubmitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTeamsError('')

    const name = teamForm.name.trim()
    const description = teamForm.description.trim()

    if (!name || !description) {
      setTeamsError('Name and description are required.')
      return
    }

    if (editingTeamId !== null) {
      const updatedTeams = teams.map(team => (
        team.id === editingTeamId
          ? { ...team, name, description }
          : team
      ))
      persistTeams(updatedTeams)
      resetTeamForm()
      return
    }

    const nextId = teams.length === 0 ? 1 : Math.max(...teams.map(team => team.id)) + 1
    const nextTeam: TeamRecord = {
      id: nextId,
      name,
      description,
    }

    persistTeams([...teams, nextTeam])
    resetTeamForm()
  }

  function handleEditTeam(team: TeamRecord) {
    setTeamsError('')
    setEditingTeamId(team.id)
    setTeamForm({
      name: team.name,
      description: team.description,
    })
  }

  function handleDeleteTeam(teamId: number) {
    setTeamsError('')

    const updatedTeams = teams.filter(team => team.id !== teamId)
    persistTeams(updatedTeams)

    const updatedUsers = users.map(user => ({
      ...user,
      team_subscriptions: user.team_subscriptions.filter(subscriptionId => subscriptionId !== teamId),
      date_modified: user.team_subscriptions.includes(teamId) ? nowIso() : user.date_modified,
    }))
    persistUsers(updatedUsers)

    if (editingTeamId === teamId) {
      resetTeamForm()
    }
  }

  return (
    <div className="settings-page">
      <header className="playground-header">
        <div>
          <h1 className="playground-title">Settings</h1>
          <p className="playground-subtitle">Manage users and teams with inline CRUD tools.</p>
        </div>
        <div className="notifications-actions">
          <Link to="/" className="btn btn-secondary">Back Home</Link>
          <Link to="/api-playground" className="btn">API Playground</Link>
        </div>
      </header>

      {isLoading && <p className="notification-preview-state">Loading settings data...</p>}
      {error && <p className="playground-error">{error}</p>}

      {!isLoading && !error && (
        <main className="settings-panels">
          <section className="settings-panel">
            <button
              type="button"
              className="settings-panel-toggle"
              onClick={() => setIsUsersOpen(prev => !prev)}
            >
              <span>Users</span>
              {isUsersOpen
                ? <ChevronUp className="settings-chevron" aria-hidden="true" />
                : <ChevronDown className="settings-chevron" aria-hidden="true" />}
            </button>

            {isUsersOpen && (
              <div className="settings-panel-content">
                <form className="settings-form" onSubmit={handleSubmitUser}>
                  <h3>{editingUserId !== null ? 'Edit User' : 'Add User'}</h3>
                  <div className="form-group">
                    <label htmlFor="user-name">Name</label>
                    <input
                      id="user-name"
                      type="text"
                      value={userForm.name}
                      onChange={(event) => setUserForm(prev => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="user-email">Email</label>
                    <input
                      id="user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(event) => setUserForm(prev => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="user-role">Role</label>
                    <input
                      id="user-role"
                      type="text"
                      value={userForm.role}
                      onChange={(event) => setUserForm(prev => ({ ...prev, role: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="user-teams">Team Subcription</label>
                    <select
                      id="user-teams"
                      multiple
                      value={userForm.teamSubscriptions}
                      onChange={(event) => {
                        const selectedValues = Array.from(event.target.selectedOptions, option => option.value)
                        setUserForm(prev => ({ ...prev, teamSubscriptions: selectedValues }))
                      }}
                    >
                      {sortedTeams.map(team => (
                        <option key={team.id} value={String(team.id)}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <small className="form-text">Hold Ctrl/Cmd to select multiple teams.</small>
                  </div>

                  {usersError && <p className="playground-error">{usersError}</p>}

                  <div className="settings-form-actions">
                    <button className="btn" type="submit">
                      {editingUserId !== null ? 'Update User' : 'Create User'}
                    </button>
                    {editingUserId !== null && (
                      <button className="btn btn-secondary" type="button" onClick={resetUserForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                <div className="playground-table-wrap">
                  <table className="playground-users-table settings-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Team Subcription</th>
                        <th>Date Created</th>
                        <th>Date Modified</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.role}</td>
                          <td>{getUserTeamLabels(user)}</td>
                          <td>{user.date_created}</td>
                          <td>{user.date_modified}</td>
                          <td>
                            <div className="settings-row-actions">
                              <button className="btn btn-secondary" type="button" onClick={() => handleEditUser(user)}>Edit</button>
                              <button className="btn btn-danger" type="button" onClick={() => handleDeleteUser(user.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="settings-panel">
            <button
              type="button"
              className="settings-panel-toggle"
              onClick={() => setIsTeamsOpen(prev => !prev)}
            >
              <span>Teams</span>
              {isTeamsOpen
                ? <ChevronUp className="settings-chevron" aria-hidden="true" />
                : <ChevronDown className="settings-chevron" aria-hidden="true" />}
            </button>

            {isTeamsOpen && (
              <div className="settings-panel-content">
                <form className="settings-form" onSubmit={handleSubmitTeam}>
                  <h3>{editingTeamId !== null ? 'Edit Team' : 'Add Team'}</h3>
                  <div className="form-group">
                    <label htmlFor="team-name">Name</label>
                    <input
                      id="team-name"
                      type="text"
                      value={teamForm.name}
                      onChange={(event) => setTeamForm(prev => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="team-description">Description</label>
                    <input
                      id="team-description"
                      type="text"
                      value={teamForm.description}
                      onChange={(event) => setTeamForm(prev => ({ ...prev, description: event.target.value }))}
                    />
                  </div>

                  {teamsError && <p className="playground-error">{teamsError}</p>}

                  <div className="settings-form-actions">
                    <button className="btn" type="submit">
                      {editingTeamId !== null ? 'Update Team' : 'Create Team'}
                    </button>
                    {editingTeamId !== null && (
                      <button className="btn btn-secondary" type="button" onClick={resetTeamForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                <div className="playground-table-wrap">
                  <table className="playground-users-table settings-table teams-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map(team => (
                        <tr key={team.id}>
                          <td>{team.id}</td>
                          <td>{team.name}</td>
                          <td>{team.description}</td>
                          <td>
                            <div className="settings-row-actions">
                              <button className="btn btn-secondary" type="button" onClick={() => handleEditTeam(team)}>Edit</button>
                              <button className="btn btn-danger" type="button" onClick={() => handleDeleteTeam(team.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  )
}
