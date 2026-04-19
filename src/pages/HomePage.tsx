import { useEffect, useState } from 'react'
import { getSessionUser, type OidcUser } from '../services/auth'

export default function HomePage() {
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

  return (
    <div className="app-container">
      <main className="welcome-container">
        <div className="welcome-content">
          <h1 className="welcome-title">Document Library</h1>
          {welcomeName && <p className="db-value">Signed in as {welcomeName}</p>}
        </div>
      </main>
    </div>
  )
}
