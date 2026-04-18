import { createClient } from '@libsql/client'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { TURSO_DB_URL, TURSO_DB_TOKEN } = process.env

if (!TURSO_DB_URL) {
  console.error('ERROR: TURSO_DB_URL is not set. Add it to your .env file.')
  process.exit(1)
}

const db = createClient({ url: TURSO_DB_URL, authToken: TURSO_DB_TOKEN })

// ---------------------------------------------------------------------------
// Create tables
// ---------------------------------------------------------------------------

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
`)

console.log('Tables created.')

// ---------------------------------------------------------------------------
// Seed data from mock JSON files
// ---------------------------------------------------------------------------

const [{ teams }, { users }] = await Promise.all([
  readFile(path.join(__dirname, '../public/mock-api/teams.json'), 'utf-8').then(JSON.parse),
  readFile(path.join(__dirname, '../public/mock-api/users.json'), 'utf-8').then(JSON.parse),
])

// Seed teams
for (const team of teams) {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO teams (id, name, description) VALUES (?, ?, ?)',
    args: [team.id, team.name, team.description],
  })
}
console.log(`Seeded ${teams.length} teams.`)

// Seed users + user_teams
for (const user of users) {
  const nameParts = user.name.split(' ')
  const given_name  = nameParts[0] || ''
  const family_name = nameParts.slice(1).join(' ') || ''
  const sub = user.email // use email as the subject identifier for seeded users

  await db.execute({
    sql: `INSERT OR IGNORE INTO users (sub, given_name, family_name, email, role, created_at, last_login_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [sub, given_name, family_name, user.email, user.role.toLowerCase(), user.date_created, user.date_modified],
  })

  for (const teamId of user.team_subscriptions ?? []) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO user_teams (user_sub, team_id) VALUES (?, ?)',
      args: [sub, teamId],
    })
  }
}
console.log(`Seeded ${users.length} users.`)

db.close()
console.log('Done.')
