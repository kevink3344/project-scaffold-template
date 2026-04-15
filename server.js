import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.join(__dirname, 'dist')

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

  if (url.pathname === '/api/auth/profile') {
    const profile = buildProfileFromHeaders(req.headers)
    sendJson(res, 200, profile)
    return
  }

  await serveStaticFile(req, res)
})

const port = Number(process.env.PORT || 8080)
server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
