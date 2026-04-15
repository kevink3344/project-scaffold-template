const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || ''
const OIDC_REDIRECT_URI = import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/auth/callback`

const AUTH_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/auth'
const TOKEN_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/token'
const USERINFO_ENDPOINT = 'https://stargate.wcpss.net/idp/profile/oidc/userinfo'
const APP_SERVICE_ME_ENDPOINT = '/.auth/me'
const APP_SERVICE_LOGOUT_ENDPOINT = '/.auth/logout'

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
  type?: string
  value?: string
}

interface PlatformAuthRecord {
  user_id?: string
  userDetails?: string
  user_claims?: PlatformClaim[]
}

interface ClientPrincipalPayload {
  userId?: string
  userDetails?: string
  claims?: PlatformClaim[]
}

interface AppServiceMeObjectPayload {
  clientPrincipal?: ClientPrincipalPayload
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
    const redirectTarget = encodeURIComponent(`${window.location.origin}/`)
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

function normalizeClaimType(claim: PlatformClaim): string {
  return (claim.typ || claim.type || '').toLowerCase()
}

function normalizeClaimValue(claim: PlatformClaim): string {
  return claim.val || claim.value || ''
}

function getClaimValue(claims: PlatformClaim[] | undefined, keys: string[]): string {
  if (!claims?.length) return ''

  const normalizedKeys = keys.map(key => key.toLowerCase())
  const exact = claims.find(claim => normalizedKeys.includes(normalizeClaimType(claim)))
  if (exact) return normalizeClaimValue(exact)

  const suffix = claims.find(claim => {
    const claimType = normalizeClaimType(claim)
    return normalizedKeys.some(key => claimType.endsWith(`/${key}`))
  })

  return suffix ? normalizeClaimValue(suffix) : ''
}

function getPrimaryAuthRecord(payload: unknown): PlatformAuthRecord | null {
  if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object' && payload[0] !== null) {
    return payload[0] as PlatformAuthRecord
  }

  if (typeof payload === 'object' && payload !== null) {
    const objectPayload = payload as AppServiceMeObjectPayload
    if (objectPayload.clientPrincipal) {
      return {
        user_id: objectPayload.clientPrincipal.userId,
        userDetails: objectPayload.clientPrincipal.userDetails,
        user_claims: objectPayload.clientPrincipal.claims,
      }
    }
  }

  return null
}

function normalizePlatformUser(record: PlatformAuthRecord): OidcUser | null {
  const claims = record.user_claims
  const email = getClaimValue(claims, ['email', 'preferred_username', 'upn', 'nameidentifier', 'emailaddress']) || record.userDetails || ''
  const givenName = getClaimValue(claims, ['given_name', 'givenname'])
  const familyName = getClaimValue(claims, ['family_name', 'surname'])
  const sub = getClaimValue(claims, ['sub', 'nameidentifier']) || record.user_id || email || 'authenticated-user'
  const displayName = getClaimValue(claims, ['name']) || [givenName, familyName].filter(Boolean).join(' ') || record.userDetails || email || sub

  return {
    sub,
    name: displayName,
    given_name: givenName,
    family_name: familyName,
    email,
  }
}

export async function getSessionUser(): Promise<OidcUser | null> {
  if (isAppServiceAuthConfigured()) {
    try {
      const response = await fetch(APP_SERVICE_ME_ENDPOINT, { credentials: 'include' })
      if (response.ok) {
        const payload = await response.json() as unknown
        const authRecord = getPrimaryAuthRecord(payload)
        if (authRecord) {
          const platformUser = normalizePlatformUser(authRecord)
          localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(platformUser))
          return platformUser
        }
      }
    } catch {
      // Fall through to local storage / OIDC fallback.
    }
  }

  const storedUser = getStoredUser()
  if (storedUser) return storedUser

  try {
    const response = await fetch(APP_SERVICE_ME_ENDPOINT, { credentials: 'include' })
    if (!response.ok) return null

    const payload = await response.json() as unknown
    const authRecord = getPrimaryAuthRecord(payload)
    if (!authRecord) return null

    const user = normalizePlatformUser(authRecord)

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

  if (isAppServiceAuthConfigured()) {
    const redirectTarget = encodeURIComponent(`${window.location.origin}/`)
    window.location.href = `${APP_SERVICE_LOGOUT_ENDPOINT}?post_logout_redirect_uri=${redirectTarget}`
  }
}
