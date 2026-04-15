import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { getSessionUser, type OidcUser } from '../services/auth'

type StorageMode = 'cloud' | 'local'

function getMapEmbedUrl(latitude: number, longitude: number): string {
  const delta = 0.0035
  const left = longitude - delta
  const right = longitude + delta
  const top = latitude + delta
  const bottom = latitude - delta
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`
}

function getMapPageUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
}

export default function HomePage() {
  const dbServer = import.meta.env.VITE_DB_SERVER || ''
  const dbName = import.meta.env.VITE_DB_NAME || ''
  const sqliteFile = import.meta.env.VITE_SQLITE_FILE || './local-data/app.sqlite3'
  const sqliteMode = import.meta.env.VITE_SQLITE_MODE || 'WAL'
  const rawBuildVersion = import.meta.env.VITE_APP_VERSION || 'local'
  const buildVersion = rawBuildVersion.length > 10 ? rawBuildVersion.slice(0, 10) : rawBuildVersion
  const isConnected = Boolean(dbServer && dbName)
  const isLocalReady = Boolean(sqliteFile)

  const [storageMode, setStorageMode] = useState<StorageMode>('cloud')
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isAddressLoading, setIsAddressLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null)
  const [address, setAddress] = useState('')
  const [user, setUser] = useState<OidcUser | null>(null)
  const hasUserProfileClaims = Boolean(
    user && (
      (user.email && user.email !== 'authenticated-user')
      || user.given_name
      || user.family_name
      || (user.name && user.name !== 'authenticated-user')
    ),
  )
  const welcomeName = user
    ? (hasUserProfileClaims ? user.name : 'Signed in user')
    : ''

  useEffect(() => {
    let isMounted = true

    getSessionUser().then(sessionUser => {
      if (isMounted) {
        setUser(sessionUser)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  async function reverseGeocode(latitude: number, longitude: number) {
    setIsAddressLoading(true)
    setAddress('')

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to resolve address')
      }

      const data = await response.json() as { display_name?: string }
      setAddress(data.display_name || 'Address unavailable')
    } catch {
      setAddress('Address unavailable')
    } finally {
      setIsAddressLoading(false)
    }
  }

  function handleShowLocation() {
    setLocationError('')
    setAddress('')

    if (!navigator.geolocation) {
      setLocation(null)
      setLocationError('Geolocation is not supported by this browser.')
      return
    }

    setIsLocationLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        setLocation({
          latitude,
          longitude,
        })
        setIsLocationLoading(false)
        await reverseGeocode(latitude, longitude)
      },
      (error) => {
        setLocation(null)
        setIsLocationLoading(false)

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied.')
          return
        }

        setLocationError('Unable to get your location right now.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    )
  }

  return (
    <div className="app-container">
      <main className="welcome-container">
        <div className="welcome-content">
          <h1 className="welcome-title">{welcomeName ? `Welcome, ${welcomeName}` : 'Welcome'}</h1>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleShowLocation}
            disabled={isLocationLoading}
          >
            {isLocationLoading ? 'Getting location...' : 'Show location'}
          </button>

          {location && (
            <div className="location-display">
              <div className="location-header">
                <MapPin aria-hidden="true" />
                <span>Current Location</span>
              </div>
              <p className="location-coordinate">Latitude: {location.latitude.toFixed(6)}</p>
              <p className="location-coordinate">Longitude: {location.longitude.toFixed(6)}</p>
              <p className="location-address">
                {isAddressLoading ? 'Resolving address...' : `Address: ${address || 'Address unavailable'}`}
              </p>
              <div className="location-map">
                <iframe
                  title="Current location map"
                  className="location-map-frame"
                  src={getMapEmbedUrl(location.latitude, location.longitude)}
                  loading="lazy"
                />
                <a
                  className="location-map-link"
                  href={getMapPageUrl(location.latitude, location.longitude)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in OpenStreetMap
                </a>
              </div>
            </div>
          )}

          {locationError && <p className="api-error">{locationError}</p>}
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

        <div className="build-version" title={`Build ${rawBuildVersion}`}>
          Build: {buildVersion}
        </div>
      </footer>
    </div>
  )
}
