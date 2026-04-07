import './App.css'

function App() {
  const dbServer = import.meta.env.VITE_DB_SERVER || ''
  const dbName = import.meta.env.VITE_DB_NAME || ''
  const isConnected = Boolean(dbServer && dbName)

  return (
    <div className="app-container">
      <main className="welcome-container">
        <h1 className="welcome-title">Welcome</h1>
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
  )
}

export default App
