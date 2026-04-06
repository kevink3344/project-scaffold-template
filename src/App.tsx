import './App.css'

function App() {
  const dbServer = import.meta.env.VITE_DB_SERVER || 'Not configured'
  const dbName = import.meta.env.VITE_DB_NAME || 'Not configured'

  return (
    <div className="app-container">
      <main className="welcome-container">
        <h1 className="welcome-title">Welcome</h1>
      </main>

      <footer className="database-info">
        <div className="db-info-item">
          <span className="db-label">Database Server:</span>
          <span className="db-value">{dbServer}</span>
        </div>
        <div className="db-info-item">
          <span className="db-label">Database Name:</span>
          <span className="db-value">{dbName}</span>
        </div>
      </footer>
    </div>
  )
}

export default App
