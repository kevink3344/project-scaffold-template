const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || ''
const OIDC_REDIRECT_URI = import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/auth/callback`

const AUTH_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/auth'
const TOKEN_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/token'
const USERINFO_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/userinfo'

const STORAGE_KEYS = {
  accessToken: 'oidc_access_token',
  idToken: 'oidc_id_token',
  user: 'oidc_user',
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

interface PlatformClaim {
  typ?: string
  val?: string
}

interface PlatformAuthRecord {
  user_id?: string
  userDetails?: string
  user_claims?: PlatformClaim[]
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

export async function login(): Promise<void> {
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

function getClaimValue(claims: PlatformClaim[] | undefined, key: string): string {
  return claims?.find(claim => claim.typ?.toLowerCase() === key.toLowerCase())?.val || ''
}

function normalizePlatformUser(record: PlatformAuthRecord): OidcUser | null {
  const claims = record.user_claims
  const email = getClaimValue(claims, 'email') || getClaimValue(claims, 'preferred_username') || record.userDetails || ''
  const givenName = getClaimValue(claims, 'given_name')
  const familyName = getClaimValue(claims, 'family_name')
  const displayName = getClaimValue(claims, 'name') || [givenName, familyName].filter(Boolean).join(' ') || record.userDetails || email
  const sub = getClaimValue(claims, 'sub') || record.user_id || email

  if (!displayName) return null

  return {
    sub,
    name: displayName,
    given_name: givenName,
    family_name: familyName,
    email,
  }
}

export async function getSessionUser(): Promise<OidcUser | null> {
  const storedUser = getStoredUser()
  if (storedUser) return storedUser

  try {
    const response = await fetch('/.auth/me', { credentials: 'include' })
    if (!response.ok) return null

    const payload = await response.json() as PlatformAuthRecord[]
    if (!Array.isArray(payload) || payload.length === 0) return null

    const user = normalizePlatformUser(payload[0])
    if (!user) return null

    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
    return user
  } catch {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken)
  localStorage.removeItem(STORAGE_KEYS.idToken)
  localStorage.removeItem(STORAGE_KEYS.user)
}
