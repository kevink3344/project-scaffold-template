import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleCallback, markSessionAuthenticated } from '../services/auth'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const isAppServiceCallback = window.location.pathname.startsWith('/.auth/login/')
    const isSignedInLanding = window.location.pathname === '/auth/signed-in'

    if (isSignedInLanding) {
      markSessionAuthenticated()
      navigate('/', { replace: true })
      return
    }

    if (isAppServiceCallback) {
      markSessionAuthenticated()

      const redirectTarget = state?.startsWith('redir=')
        ? decodeURIComponent(state.slice('redir='.length))
        : `${window.location.origin}/`

      window.location.replace(redirectTarget)
      return
    }

    if (!code || !state) {
      setError('Missing authorization code or state.')
      return
    }

    handleCallback(code, state)
      .then(() => navigate('/', { replace: true }))
      .catch((err: Error) => setError(err.message))
  }, [navigate])

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Login Failed</h2>
        <p>{error}</p>
        <a href="/">Return Home</a>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Completing sign in...</p>
    </div>
  )
}
