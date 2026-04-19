import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.join(__dirname, 'dist')

// ---------------------------------------------------------------------------
// Turso DB setup  (@libsql/client)
// ---------------------------------------------------------------------------

const DEV_MODE = process.env.DEV_MODE === 'true'
const TURSO_DB_URL = process.env.TURSO_DB_URL
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN

if (!TURSO_DB_URL) {
  throw new Error(
    'Missing TURSO_DB_URL. Configure the Azure App Service application setting TURSO_DB_URL, or set it in the local environment before starting server.js.'
  )
}

const db = createClient({
  url: TURSO_DB_URL,
  authToken: TURSO_DB_TOKEN,
})

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS users (
    sub           TEXT PRIMARY KEY,
    given_name    TEXT NOT NULL DEFAULT '',
    family_name   TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    TEXT NOT NULL,
    last_login_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teams (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS user_teams (
    user_sub TEXT    NOT NULL,
    team_id  INTEGER NOT NULL,
    PRIMARY KEY (user_sub, team_id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
`)

// Seed default categories if the table is empty
{
  const countResult = await db.execute('SELECT COUNT(*) as count FROM categories')
  const catCount = Number(countResult.rows[0][0])
  if (catCount === 0) {
    const defaults = ['HR', 'Finance', 'Operations', 'Legal', 'Safety', 'Training']
    for (let i = 0; i < defaults.length; i++) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES (?, ?, ?)',
        args: [`cat-${i + 1}`, defaults[i], i],
      })
    }
    console.log('[db] Seeded default categories.')
  }
}

// Map a libSQL ResultSet's first row to a plain object
function rowToObj(resultSet) {
  if (!resultSet.rows.length) return null
  const row = resultSet.rows[0]
  return Object.fromEntries(resultSet.columns.map((col, i) => [col, row[i]]))
}

// Map all rows of a libSQL ResultSet to plain objects
function rowsToObjs(resultSet) {
  return resultSet.rows.map(row =>
    Object.fromEntries(resultSet.columns.map((col, i) => [col, row[i]]))
  )
}

// ---------------------------------------------------------------------------
// Outbound webhook � fires to Power Automate when a new user is created
// ---------------------------------------------------------------------------

const PA_NEW_USER_WEBHOOK_URL = process.env.PA_NEW_USER_WEBHOOK_URL || ''

function fireNewUserWebhook(user) {
  if (!PA_NEW_USER_WEBHOOK_URL) return
  fetch(PA_NEW_USER_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sub:         user.sub,
      given_name:  user.given_name,
      family_name: user.family_name,
      email:       user.email,
      created_at:  user.created_at,
    }),
  }).catch(err => console.error('[webhook] Failed to notify Power Automate:', err.message))
}

async function upsertAndGetUser(user) {
  const now = new Date().toISOString()
  const existing = await db.execute({ sql: 'SELECT 1 FROM users WHERE sub = ?', args: [user.sub] })
  const isNew = existing.rows.length === 0

  await db.execute({
    sql: `INSERT INTO users (sub, given_name, family_name, email, role, created_at, last_login_at)
          VALUES (?, ?, ?, ?, 'user', ?, ?)
          ON CONFLICT(sub) DO UPDATE SET
            given_name    = excluded.given_name,
            family_name   = excluded.family_name,
            email         = excluded.email,
            last_login_at = excluded.last_login_at`,
    args: [user.sub, user.given_name || '', user.family_name || '', user.email || '', now, now],
  })

  const result = await db.execute({ sql: 'SELECT * FROM users WHERE sub = ?', args: [user.sub] })
  const dbUser = rowToObj(result)
  if (isNew) fireNewUserWebhook(dbUser)
  return dbUser
}

// ---------------------------------------------------------------------------
// Dev-mode session store (in-memory, local only)
// ---------------------------------------------------------------------------

const devSessions = new Map()   // token -> { user, expires }

function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

function parseCookies(cookieHeader) {
  const cookies = {}
  if (!cookieHeader) return cookies
  for (const pair of cookieHeader.split(';')) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx < 0) continue
    const key = pair.slice(0, eqIdx).trim()
    const val = pair.slice(eqIdx + 1).trim()
    if (key) cookies[key] = decodeURIComponent(val)
  }
  return cookies
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function getDevSessionUser(cookies) {
  const token = cookies.dev_session
  if (!token) return null
  const session = devSessions.get(token)
  if (!session) return null
  if (session.expires < Date.now()) {
    devSessions.delete(token)
    return null
  }
  return session.user
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.map': 'application/json; charset=utf-8',
}

function decodeClientPrincipal(headerValue) {
  if (!headerValue) return null

  try {
    const normalized = headerValue.replace(/-/g, '+').replace(/_/g, '/')
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const json = Buffer.from(normalized + padding, 'base64').toString('utf-8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getClaimValue(claims, names) {
  if (!Array.isArray(claims) || claims.length === 0) return ''

  const normalizedNames = names.map(name => name.toLowerCase())

  const exactMatch = claims.find(claim => {
    const claimType = String(claim.typ || claim.type || '').toLowerCase()
    return normalizedNames.includes(claimType)
  })

  if (exactMatch) {
    return String(exactMatch.val || exactMatch.value || '')
  }

  const suffixMatch = claims.find(claim => {
    const claimType = String(claim.typ || claim.type || '').toLowerCase()
    return normalizedNames.some(name => claimType.endsWith('/' + name))
  })

  return suffixMatch ? String(suffixMatch.val || suffixMatch.value || '') : ''
}

function buildProfileFromHeaders(headers) {
  const clientPrincipal = decodeClientPrincipal(headers['x-ms-client-principal'])

  const claimSource = clientPrincipal?.claims || []
  const givenName = getClaimValue(claimSource, ['given_name', 'givenname'])
  const familyName = getClaimValue(claimSource, ['family_name', 'surname'])
  const email = getClaimValue(claimSource, ['email', 'preferred_username', 'upn', 'emailaddress'])

  const userDetails = String(clientPrincipal?.userDetails || headers['x-ms-client-principal-name'] || '')
  const sub = String(clientPrincipal?.userId || headers['x-ms-client-principal-id'] || email || 'authenticated-user')
  const name = getClaimValue(claimSource, ['name']) || [givenName, familyName].filter(Boolean).join(' ') || userDetails || email || 'Signed in user'

  const hasAuthHeader = Boolean(headers['x-ms-client-principal'] || headers['x-ms-client-principal-id'] || headers['x-ms-client-principal-name'])
  if (!hasAuthHeader) {
    return { authenticated: false }
  }

  return {
    authenticated: true,
    user: {
      sub,
      name,
      given_name: givenName,
      family_name: familyName,
      email,
    },
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  })
  res.end(JSON.stringify(payload))
}

async function serveStaticFile(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  let requestPath = decodeURIComponent(url.pathname)

  if (requestPath === '/') {
    requestPath = '/index.html'
  }

  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '')
  const absolutePath = path.join(distDir, safePath)

  try {
    const stats = await fs.stat(absolutePath)
    if (stats.isDirectory()) {
      const fileData = await fs.readFile(path.join(absolutePath, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(fileData)
      return
    }

    const ext = path.extname(absolutePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const fileData = await fs.readFile(absolutePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(fileData)
  } catch {
    if (requestPath.startsWith('/api/')) {
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    try {
      const indexFile = await fs.readFile(path.join(distDir, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(indexFile)
    } catch {
      sendJson(res, 500, { error: 'Application not built or unavailable' })
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Bad request' })
    return
  }

  const url = new URL(req.url, 'http://localhost')
  const cookies = parseCookies(req.headers.cookie)

  // Health check
  if (url.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', dev_mode: DEV_MODE })
    return
  }

  // Dev login � only available when DEV_MODE=true
  if (DEV_MODE && url.pathname === '/api/dev/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const expectedUser = process.env.DEV_LOGIN_USERNAME
      const expectedPass = process.env.DEV_LOGIN_PASSWORD
      if (!expectedUser || !expectedPass || body.username !== expectedUser || body.password !== expectedPass) {
        sendJson(res, 401, { error: 'Invalid credentials' })
        return
      }

      const devUser = {
        sub:         process.env.DEV_USER_SUB          || 'dev-user-001',
        name:        process.env.DEV_USER_NAME         || 'Dev User',
        given_name:  process.env.DEV_USER_GIVEN_NAME   || '',
        family_name: process.env.DEV_USER_FAMILY_NAME  || '',
        email:       process.env.DEV_USER_EMAIL        || '',
      }

      const token = generateToken()
      devSessions.set(token, { user: devUser, expires: Date.now() + 8 * 60 * 60 * 1000 })

      const dbUser = await upsertAndGetUser(devUser)

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `dev_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
      })
      res.end(JSON.stringify({ authenticated: true, user: { ...devUser, role: dbUser?.role || 'user' } }))
    } catch {
      sendJson(res, 400, { error: 'Bad request' })
    }
    return
  }

  // Dev logout
  if (DEV_MODE && url.pathname === '/api/dev/logout' && req.method === 'POST') {
    const token = cookies.dev_session
    if (token) devSessions.delete(token)
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'dev_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    })
    res.end(JSON.stringify({ authenticated: false }))
    return
  }

  // Auth profile � upserts user into Turso DB on every authenticated call
  if (url.pathname === '/api/auth/profile') {
    let profile

    if (DEV_MODE) {
      const devUser = getDevSessionUser(cookies)
      if (devUser) {
        const dbUser = await upsertAndGetUser(devUser)
        profile = { authenticated: true, user: { ...devUser, role: dbUser?.role || 'user' } }
      } else {
        profile = { authenticated: false }
      }
    } else {
      profile = buildProfileFromHeaders(req.headers)
      if (profile.authenticated && profile.user) {
        const dbUser = await upsertAndGetUser(profile.user)
        profile.user.role = dbUser?.role || 'user'
      }
    }

    sendJson(res, 200, profile)
    return
  }

  // Users list
  if (url.pathname === '/api/users' && req.method === 'GET') {
    const result = await db.execute(
      'SELECT sub, given_name, family_name, email, role, created_at, last_login_at FROM users ORDER BY family_name, given_name'
    )
    sendJson(res, 200, { users: rowsToObjs(result) })
    return
  }

  // Teams list
  if (url.pathname === '/api/teams' && req.method === 'GET') {
    const result = await db.execute('SELECT * FROM teams ORDER BY name')
    sendJson(res, 200, { teams: rowsToObjs(result) })
    return
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  // GET /api/categories — list all
  if (url.pathname === '/api/categories' && req.method === 'GET') {
    const result = await db.execute('SELECT id, name, sort_order FROM categories ORDER BY sort_order, name')
    sendJson(res, 200, { categories: rowsToObjs(result) })
    return
  }

  // POST /api/categories — create
  if (url.pathname === '/api/categories' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const name = String(body.name || '').trim()
      if (!name) {
        sendJson(res, 400, { error: 'name is required' })
        return
      }
      const id = `cat-${crypto.randomUUID()}`
      const orderResult = await db.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM categories')
      const nextOrder = Number(orderResult.rows[0][0])
      await db.execute({
        sql: 'INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)',
        args: [id, name, nextOrder],
      })
      sendJson(res, 201, { id, name, sort_order: nextOrder })
    } catch (err) {
      if (String(err?.message).includes('UNIQUE')) {
        sendJson(res, 409, { error: 'A category with that name already exists.' })
      } else {
        sendJson(res, 400, { error: 'Bad request' })
      }
    }
    return
  }

  // DELETE /api/categories/:id
  {
    const deleteMatch = url.pathname.match(/^\/api\/categories\/([^/]+)$/)
    if (deleteMatch && req.method === 'DELETE') {
      const catId = deleteMatch[1]
      await db.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [catId] })
      sendJson(res, 200, { deleted: catId })
      return
    }
  }

  // Webhook test � sends a sample payload to PA_NEW_USER_WEBHOOK_URL and reports back
  if (url.pathname === '/api/webhooks/test' && req.method === 'POST') {
    if (!PA_NEW_USER_WEBHOOK_URL) {
      sendJson(res, 503, {
        success: false,
        message: 'PA_NEW_USER_WEBHOOK_URL is not configured. Add it to your .env file.',
      })
      return
    }

    const testPayload = {
      sub:         'test-user-000',
      given_name:  'Test',
      family_name: 'User',
      email:       'test@example.com',
      created_at:  new Date().toISOString(),
    }

    try {
      const paRes = await fetch(PA_NEW_USER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      })
      let paBody = null
      const contentType = paRes.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        paBody = await paRes.json().catch(() => null)
      } else {
        const text = await paRes.text().catch(() => '')
        if (text) paBody = text
      }
      sendJson(res, 200, {
        success: true,
        message: `Power Automate responded with HTTP ${paRes.status}.`,
        payload_sent: testPayload,
        pa_response: paBody,
      })
    } catch (err) {
      sendJson(res, 502, {
        success: false,
        message: `Failed to reach Power Automate: ${err.message}`,
      })
    }
    return
  }

  await serveStaticFile(req, res)
})

const port = Number(process.env.PORT || 8080)
server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
