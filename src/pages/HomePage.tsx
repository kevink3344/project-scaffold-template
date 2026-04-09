import { useEffect, useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin, googleLogout, type CredentialResponse } from '@react-oauth/google'
import { Bell, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clearAuthToken, setAuthToken } from '../services/api/client'

interface GoogleUser {
  name: string
  email: string
  picture: string
}

type StorageMode = 'cloud' | 'local'
type ThemeMode = 'light' | 'dark'

function parseJwt(token: string): GoogleUser {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  )
  return JSON.parse(json) as GoogleUser
}

export default function HomePage() {
  const dbServer = import.meta.env.VITE_DB_SERVER || ''
  const dbName = import.meta.env.VITE_DB_NAME || ''
  const sqliteFile = import.meta.env.VITE_SQLITE_FILE || './local-data/app.sqlite3'
  const sqliteMode = import.meta.env.VITE_SQLITE_MODE || 'WAL'
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const isConnected = Boolean(dbServer && dbName)
  const isLocalReady = Boolean(sqliteFile)

  const [user, setUser] = useState<GoogleUser | null>(null)
  const [storageMode, setStorageMode] = useState<StorageMode>('cloud')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('themeMode')
    return savedMode === 'dark' ? 'dark' : 'light'
  })
  const isDarkMode = themeMode === 'dark'

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode)
  }, [themeMode])

  function handleLoginSuccess(response: CredentialResponse) {
    if (response.credential) {
      setAuthToken(response.credential)
      setUser(parseJwt(response.credential))
    }
  }

  function handleLogout() {
    googleLogout()
    clearAuthToken()
    setUser(null)
  }

  function toggleThemeMode() {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const headerControls = (
    <div className="header-controls">
      <button
        type="button"
        className="icon-btn"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell aria-hidden="true" />
      </button>
      <button
        type="button"
        className="icon-btn theme-toggle-btn"
        onClick={toggleThemeMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>
    </div>
  )

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className={`app-container ${themeMode}`}>
        <header className="app-header">
          <div className="api-test-control">
            <Link to="/api-playground" className="btn">API Playground</Link>
          </div>
          <div className="auth-section">
            {headerControls}
            {user ? (
              <div className="user-info">
                <img src={user.picture} alt={user.name} className="user-avatar" referrerPolicy="no-referrer" />
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <button className="btn btn-secondary" onClick={handleLogout}>Sign Out</button>
              </div>
            ) : (
              <div className="login-section">
                {googleClientId ? (
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={() => console.error('Google login failed')}
                    text="signin_with"
                    shape="rectangular"
                    theme={isDarkMode ? 'filled_black' : 'outline'}
                    size="large"
                  />
                ) : (
                  <div className="login-placeholder">
                    <span>Google Client ID not configured</span>
                    <small>Set VITE_GOOGLE_CLIENT_ID in .env</small>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="welcome-container">
          <div className="welcome-content">
            <h1 className="welcome-title">
              {user ? `Welcome, ${user.name.split(' ')[0]}!` : 'Welcome'}
            </h1>
          </div>
        </main>

        <footer className="database-info">
          <div className="storage-toggle" role="group" aria-label="Storage mode">
            <button
              type="button"
              className={`btn storage-btn ${storageMode === 'local' ? 'active' : ''}`}
              onClick={() => setStorageMode('local')}
            >
              Local
            </button>
            <button
              type="button"
              className={`btn storage-btn ${storageMode === 'cloud' ? 'active' : ''}`}
              onClick={() => setStorageMode('cloud')}
            >
              Cloud
            </button>
          </div>

          <div className={`connection-status ${storageMode === 'cloud' ? (isConnected ? 'connected' : 'disconnected') : (isLocalReady ? 'connected' : 'disconnected')}`}>
            <span className="status-dot"></span>
            <span className="status-label">
              {storageMode === 'cloud'
                ? (isConnected ? 'Cloud Connected' : 'Cloud Not Connected')
                : (isLocalReady ? 'Local Ready' : 'Local Not Ready')}
            </span>
          </div>

          {storageMode === 'cloud' ? (
            <>
              <div className="db-info-item">
                <span className="db-label">Database Server:</span>
                <span className="db-value">{dbServer || 'Not configured'}</span>
              </div>
              <div className="db-info-item">
                <span className="db-label">Database Name:</span>
                <span className="db-value">{dbName || 'Not configured'}</span>
              </div>
            </>
          ) : (
            <>
              <div className="db-info-item">
                <span className="db-label">SQLite File:</span>
                <span className="db-value">{sqliteFile || 'Not configured'}</span>
              </div>
              <div className="db-info-item">
                <span className="db-label">SQLite Mode:</span>
                <span className="db-value">{sqliteMode || 'Not configured'}</span>
              </div>
            </>
          )}
        </footer>
      </div>
    </GoogleOAuthProvider>
  )
}
