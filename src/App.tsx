import { useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin, googleLogout, type CredentialResponse } from '@react-oauth/google'
import './App.css'

interface GoogleUser {
  name: string
  email: string
  picture: string
}

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

function App() {
  const dbServer = import.meta.env.VITE_DB_SERVER || ''
  const dbName = import.meta.env.VITE_DB_NAME || ''
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const isConnected = Boolean(dbServer && dbName)

  const [user, setUser] = useState<GoogleUser | null>(null)

  function handleLoginSuccess(response: CredentialResponse) {
    if (response.credential) {
      setUser(parseJwt(response.credential))
    }
  }

  function handleLogout() {
    googleLogout()
    setUser(null)
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="app-container">
        <header className="app-header">
          <div className="auth-section">
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
                    theme="outline"
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
          <h1 className="welcome-title">
            {user ? `Welcome, ${user.name.split(' ')[0]}!` : 'Welcome'}
          </h1>
        </main>

        <footer className="database-info">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-label">{isConnected ? 'Connected' : 'Not Connected'}</span>
          </div>
          <div className="db-info-item">
            <span className="db-label">Database Server:</span>
            <span className="db-value">{dbServer || 'Not configured'}</span>
          </div>
          <div className="db-info-item">
            <span className="db-label">Database Name:</span>
            <span className="db-value">{dbName || 'Not configured'}</span>
          </div>
        </footer>
      </div>
    </GoogleOAuthProvider>
  )
}

export default App
