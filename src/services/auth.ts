const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || ''
const OIDC_REDIRECT_URI = import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/auth/callback`

const AUTH_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/auth'
const TOKEN_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/token'
const USERINFO_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/userinfo'
const APP_SERVICE_LOGOUT_ENDPOINT = '/.auth/logout'
const APP_SERVICE_PROFILE_ENDPOINT = '/api/auth/profile'
const APP_SERVICE_SIGNED_IN_ROUTE = '/auth/signed-in'

const STORAGE_KEYS = {
  accessToken: 'oidc_access_token',
  idToken: 'oidc_id_token',
  user: 'oidc_user',
  sessionHint: 'oidc_session_hint',
  codeVerifier: 'oidc_code_verifier',
  state: 'oidc_state',
}

export interface OidcUser {
  sub: string
  name: string
  given_name: string
  family_name: string
  email: string
}

export function markSessionAuthenticated(): void {
  localStorage.setItem(STORAGE_KEYS.sessionHint, 'true')
}

function hasSessionHint(): boolean {
  return localStorage.getItem(STORAGE_KEYS.sessionHint) === 'true'
}

interface ServerProfilePayload {
  authenticated: boolean
  user?: Partial<OidcUser>
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function getAppServiceProviderName(): string {
  const redirectMatch = OIDC_REDIRECT_URI.match(/\/\.auth\/login\/([^/]+)\//)
  return redirectMatch?.[1] || 'Rapid_ID_Provider'
}

function isAppServiceAuthConfigured(): boolean {
  return OIDC_REDIRECT_URI.includes('/.auth/login/') || window.location.hostname.endsWith('.azurewebsites.net')
}

export async function login(): Promise<void> {
  if (isAppServiceAuthConfigured()) {
    const provider = getAppServiceProviderName()
    const redirectTarget = encodeURIComponent(`${window.location.origin}${APP_SERVICE_SIGNED_IN_ROUTE}`)
    window.location.href = `/.auth/login/${provider}?post_login_redirect_uri=${redirectTarget}`
    return
  }

  const codeVerifier = generateRandomString(64)
  const state = generateRandomString(32)
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier)
  sessionStorage.setItem(STORAGE_KEYS.state, state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OIDC_CLIENT_ID,
    redirect_uri: OIDC_REDIRECT_URI,
    scope: 'openid',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`
}

export async function handleCallback(code: string, state: string): Promise<OidcUser> {
  const savedState = sessionStorage.getItem(STORAGE_KEYS.state)
  if (state !== savedState) {
    throw new Error('Invalid state parameter')
  }

  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier) || ''

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: OIDC_REDIRECT_URI,
      client_id: OIDC_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error('Token exchange failed')
  }

  const tokens = await tokenResponse.json() as { access_token: string; id_token: string }
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token)
  localStorage.setItem(STORAGE_KEYS.idToken, tokens.id_token)

  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier)
  sessionStorage.removeItem(STORAGE_KEYS.state)

  const userInfoResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userInfoResponse.ok) {
    throw new Error('Failed to fetch user info')
  }

  const user = await userInfoResponse.json() as OidcUser
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
  return user
}

export function getStoredUser(): OidcUser | null {
  const data = localStorage.getItem(STORAGE_KEYS.user)
  if (!data) return null
  try {
    return JSON.parse(data) as OidcUser
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken)
}

function normalizeServerProfileUser(user: Partial<OidcUser> | undefined): OidcUser {
  const givenName = user?.given_name || ''
  const familyName = user?.family_name || ''
  const email = user?.email || ''
  const sub = user?.sub || email || 'authenticated-user'
  const name = user?.name || [givenName, familyName].filter(Boolean).join(' ') || email || 'Signed in user'

  return {
    sub,
    name,
    given_name: givenName,
    family_name: familyName,
    email,
  }
}

async function getServerSessionUser(): Promise<OidcUser | null> {
  try {
    const response = await fetch(APP_SERVICE_PROFILE_ENDPOINT, { credentials: 'include' })
    if (!response.ok) return null

    const payload = await response.json() as ServerProfilePayload
    if (!payload.authenticated) return null

    return normalizeServerProfileUser(payload.user)
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<OidcUser | null> {
  if (isAppServiceAuthConfigured()) {
    const serverUser = await getServerSessionUser()
    if (serverUser) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(serverUser))
      return serverUser
    }
  }

  const storedUser = getStoredUser()
  if (storedUser) return storedUser

  if (hasSessionHint()) {
    return {
      sub: 'authenticated-user',
      name: 'Signed in user',
      given_name: '',
      family_name: '',
      email: '',
    }
  }

  return null
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken)
  localStorage.removeItem(STORAGE_KEYS.idToken)
  localStorage.removeItem(STORAGE_KEYS.user)
  localStorage.removeItem(STORAGE_KEYS.sessionHint)

  if (isAppServiceAuthConfigured()) {
    const redirectTarget = encodeURIComponent(`${window.location.origin}/`)
    window.location.href = `${APP_SERVICE_LOGOUT_ENDPOINT}?post_logout_redirect_uri=${redirectTarget}`
  }
}
