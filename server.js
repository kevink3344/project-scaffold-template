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

const DEFAULT_CATEGORIES = ['HR', 'Finance', 'Operations', 'Legal', 'Safety', 'Training']

const SEEDED_DOCUMENTS = [
  {
    id: 'doc-001',
    name: 'Forklift Safety Data Sheet',
    issuer: 'Safety Office',
    code: 'SDS-FORK-2025',
    revision_date: '2025-11-20',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Safety Data Sheet',
    categories: ['Safety', 'Operations'],
    locations: ['Warehouse A', 'Warehouse B'],
    notes: 'Required reading for all warehouse team members.',
    hazard_tags: ['Flammable', 'Compressed Gas'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Warehouse Staff', 'Safety Team'],
  },
  {
    id: 'doc-002',
    name: 'Employee Code of Conduct Policy',
    issuer: 'Human Resources',
    code: 'POL-HR-002',
    revision_date: '2024-08-12',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Policy',
    categories: ['HR', 'Legal'],
    locations: ['Corporate HQ'],
    notes: 'Annual acknowledgement required.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff'],
  },
  {
    id: 'doc-003',
    name: 'Vendor Contract Template',
    issuer: 'Legal Department',
    code: 'CTR-LEG-011',
    revision_date: '2023-03-04',
    format_type: 'hybrid',
    status_badge: 'draft',
    status: 'active',
    doc_type: 'Contract',
    categories: ['Legal', 'Finance'],
    locations: ['Procurement'],
    notes: 'Draft pending approval by legal counsel.',
    hazard_tags: ['Confidential'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Procurement', 'Legal'],
  },
  {
    id: 'doc-004',
    name: 'Fire Drill SOP',
    issuer: 'Operations Excellence',
    code: 'SOP-OPS-041',
    revision_date: '2022-01-10',
    format_type: 'pdf',
    status_badge: 'archived',
    status: 'archived',
    doc_type: 'SOP',
    categories: ['Operations', 'Safety'],
    locations: ['All Sites'],
    notes: 'Superseded by SOP-OPS-052.',
    hazard_tags: ['Emergency'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff'],
  },
]

const CATEGORY_SEED_DOCUMENTS = [
  {
    id: 'doc-seed-hr-1',
    name: 'New Hire Onboarding Checklist',
    issuer: 'Human Resources',
    code: 'HR-ONB-101',
    revision_date: '2025-02-18',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Checklist',
    categories: ['HR'],
    locations: ['Corporate HQ'],
    notes: 'Used during first-week onboarding with manager sign-off.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['HR Team', 'Managers'],
  },
  {
    id: 'doc-seed-hr-2',
    name: 'Remote Work Eligibility Policy',
    issuer: 'Human Resources',
    code: 'HR-POL-204',
    revision_date: '2024-12-06',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Policy',
    categories: ['HR'],
    locations: ['All Sites'],
    notes: 'Defines hybrid scheduling and home office requirements.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff'],
  },
  {
    id: 'doc-seed-hr-3',
    name: 'Annual Performance Review SOP',
    issuer: 'People Operations',
    code: 'HR-SOP-310',
    revision_date: '2025-01-15',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'SOP',
    categories: ['HR'],
    locations: ['Corporate HQ', 'Regional Offices'],
    notes: 'Step-by-step process and rating calibration guidance.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Managers', 'HR Team'],
  },
  {
    id: 'doc-seed-hr-4',
    name: 'Employee Relations Escalation Guide',
    issuer: 'Human Resources',
    code: 'HR-GDE-411',
    revision_date: '2024-10-03',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Guideline',
    categories: ['HR'],
    locations: ['All Sites'],
    notes: 'Escalation matrix for conduct concerns and case tracking.',
    hazard_tags: ['Sensitive'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['HR Team'],
  },
  {
    id: 'doc-seed-fin-1',
    name: 'Corporate Card Usage Policy',
    issuer: 'Finance',
    code: 'FIN-POL-120',
    revision_date: '2025-01-29',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Policy',
    categories: ['Finance'],
    locations: ['All Sites'],
    notes: 'Defines spend categories, limits, and approval workflow.',
    hazard_tags: ['Compliance'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Department Leads', 'Finance'],
  },
  {
    id: 'doc-seed-fin-2',
    name: 'Month-End Close Checklist',
    issuer: 'Controllership',
    code: 'FIN-CHK-221',
    revision_date: '2025-03-01',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Checklist',
    categories: ['Finance'],
    locations: ['Corporate HQ'],
    notes: 'Runbook for accruals, reconciliations, and sign-off.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Finance Team'],
  },
  {
    id: 'doc-seed-fin-3',
    name: 'Capital Expenditure Approval Matrix',
    issuer: 'Finance',
    code: 'FIN-MTX-305',
    revision_date: '2024-11-11',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Matrix',
    categories: ['Finance'],
    locations: ['All Sites'],
    notes: 'Approval thresholds by cost center and spend class.',
    hazard_tags: ['Internal Use'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Executives', 'Finance'],
  },
  {
    id: 'doc-seed-fin-4',
    name: 'Travel Reimbursement Standard',
    issuer: 'Finance Operations',
    code: 'FIN-STD-418',
    revision_date: '2025-02-02',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Standard',
    categories: ['Finance'],
    locations: ['All Sites'],
    notes: 'Accepted expense classes and required receipt documentation.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff'],
  },
  {
    id: 'doc-seed-ops-1',
    name: 'Shift Handover Procedure',
    issuer: 'Operations',
    code: 'OPS-SOP-105',
    revision_date: '2025-01-20',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'SOP',
    categories: ['Operations'],
    locations: ['Plant 1', 'Plant 2'],
    notes: 'Standard handover log and exception handoff process.',
    hazard_tags: ['Operational Risk'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Operations Team'],
  },
  {
    id: 'doc-seed-ops-2',
    name: 'Equipment Downtime Escalation Plan',
    issuer: 'Operations Excellence',
    code: 'OPS-PLN-216',
    revision_date: '2024-09-27',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Plan',
    categories: ['Operations'],
    locations: ['All Sites'],
    notes: 'Escalation contacts and required response times by severity.',
    hazard_tags: ['Emergency'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Operations Leads', 'Maintenance'],
  },
  {
    id: 'doc-seed-ops-3',
    name: 'Warehouse Receiving Workflow',
    issuer: 'Operations',
    code: 'OPS-WRK-322',
    revision_date: '2025-02-12',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Workflow',
    categories: ['Operations'],
    locations: ['Warehouse A', 'Warehouse B'],
    notes: 'Receiving, inspection, and put-away sequence.',
    hazard_tags: ['Forklift Traffic'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Warehouse Staff'],
  },
  {
    id: 'doc-seed-ops-4',
    name: 'Service Level Monitoring Guide',
    issuer: 'Operations Excellence',
    code: 'OPS-GDE-433',
    revision_date: '2024-12-19',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Guideline',
    categories: ['Operations'],
    locations: ['Corporate HQ'],
    notes: 'KPI thresholds and escalation pathways for missed SLAs.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Operations Analysts'],
  },
  {
    id: 'doc-seed-leg-1',
    name: 'Contract Review Intake Checklist',
    issuer: 'Legal',
    code: 'LEG-CHK-112',
    revision_date: '2025-01-08',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Checklist',
    categories: ['Legal'],
    locations: ['Corporate HQ'],
    notes: 'Required clauses and risk scoring for first-pass reviews.',
    hazard_tags: ['Confidential'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Legal Team'],
  },
  {
    id: 'doc-seed-leg-2',
    name: 'Records Retention Schedule',
    issuer: 'Legal Compliance',
    code: 'LEG-STD-225',
    revision_date: '2024-11-14',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Standard',
    categories: ['Legal'],
    locations: ['All Sites'],
    notes: 'Retention timelines by document class and jurisdiction.',
    hazard_tags: ['Regulatory'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff', 'Legal'],
  },
  {
    id: 'doc-seed-leg-3',
    name: 'NDA Execution Procedure',
    issuer: 'Legal',
    code: 'LEG-SOP-334',
    revision_date: '2025-02-10',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'SOP',
    categories: ['Legal'],
    locations: ['Corporate HQ'],
    notes: 'Signature authorities and record storage requirements.',
    hazard_tags: ['Confidential'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Legal Team', 'Sales Ops'],
  },
  {
    id: 'doc-seed-leg-4',
    name: 'Regulatory Inquiry Response Playbook',
    issuer: 'Legal Compliance',
    code: 'LEG-PLB-447',
    revision_date: '2024-10-22',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Playbook',
    categories: ['Legal'],
    locations: ['All Sites'],
    notes: 'Response template and owner responsibilities for audits.',
    hazard_tags: ['Regulatory', 'Sensitive'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Legal Team', 'Executives'],
  },
  {
    id: 'doc-seed-saf-1',
    name: 'PPE Inspection Checklist',
    issuer: 'Safety Office',
    code: 'SAF-CHK-103',
    revision_date: '2025-03-04',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Checklist',
    categories: ['Safety'],
    locations: ['All Sites'],
    notes: 'Daily inspection requirements for issued PPE.',
    hazard_tags: ['PPE'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Safety Team', 'Supervisors'],
  },
  {
    id: 'doc-seed-saf-2',
    name: 'Incident Reporting Procedure',
    issuer: 'Safety Office',
    code: 'SAF-SOP-214',
    revision_date: '2024-12-20',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'SOP',
    categories: ['Safety'],
    locations: ['All Sites'],
    notes: 'Submission timelines, forms, and escalation contacts.',
    hazard_tags: ['Emergency'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff'],
  },
  {
    id: 'doc-seed-saf-3',
    name: 'Hazard Communication Standard',
    issuer: 'EHS Program',
    code: 'SAF-STD-319',
    revision_date: '2025-01-31',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Standard',
    categories: ['Safety'],
    locations: ['Warehouse A', 'Plant 2'],
    notes: 'Labeling and SDS accessibility requirements.',
    hazard_tags: ['Chemical', 'Regulatory'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Operations Team', 'Safety Team'],
  },
  {
    id: 'doc-seed-saf-4',
    name: 'Emergency Evacuation Map Guide',
    issuer: 'Safety Office',
    code: 'SAF-GDE-426',
    revision_date: '2024-08-30',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Guideline',
    categories: ['Safety'],
    locations: ['All Sites'],
    notes: 'Updated muster points and floor warden assignments.',
    hazard_tags: ['Emergency'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff'],
  },
  {
    id: 'doc-seed-trn-1',
    name: 'New Supervisor Training Curriculum',
    issuer: 'Training Office',
    code: 'TRN-CRS-115',
    revision_date: '2025-02-25',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Curriculum',
    categories: ['Training'],
    locations: ['Corporate HQ'],
    notes: 'Core modules for leadership and compliance readiness.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Supervisors'],
  },
  {
    id: 'doc-seed-trn-2',
    name: 'Forklift Recertification Plan',
    issuer: 'Training Office',
    code: 'TRN-PLN-226',
    revision_date: '2024-11-07',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Plan',
    categories: ['Training'],
    locations: ['Warehouse A', 'Warehouse B'],
    notes: 'Recertification cadence and practical assessment rubric.',
    hazard_tags: ['Forklift Safety'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Warehouse Staff'],
  },
  {
    id: 'doc-seed-trn-3',
    name: 'Annual Compliance Training Matrix',
    issuer: 'Training and Compliance',
    code: 'TRN-MTX-337',
    revision_date: '2025-01-10',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'Matrix',
    categories: ['Training'],
    locations: ['All Sites'],
    notes: 'Course requirements by role and renewal date windows.',
    hazard_tags: ['Compliance'],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['All Staff', 'Managers'],
  },
  {
    id: 'doc-seed-trn-4',
    name: 'LMS Access and Enrollment SOP',
    issuer: 'Training Office',
    code: 'TRN-SOP-440',
    revision_date: '2024-09-18',
    format_type: 'pdf',
    status_badge: 'active',
    status: 'active',
    doc_type: 'SOP',
    categories: ['Training'],
    locations: ['All Sites'],
    notes: 'Provisioning steps for learners and instructor cohorts.',
    hazard_tags: [],
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    audience: ['Training Team', 'IT Support'],
  },
]

const SEEDED_DOCUMENT_TYPES = [
  {
    id: 'dtype-1',
    name: 'Safety Data Sheet',
    description: 'Hazard and handling information',
    date_created: '2024-01-03',
    date_modified: '2025-01-12',
    created_by: 'system',
    modified_by: 'system',
  },
  {
    id: 'dtype-2',
    name: 'Policy',
    description: 'Governance and compliance policy documents',
    date_created: '2024-01-03',
    date_modified: '2025-01-12',
    created_by: 'system',
    modified_by: 'system',
  },
]

const SEEDED_VERSION_HISTORY = [
  {
    id: 'vh-1',
    doc_name: 'Employee Code of Conduct Policy',
    version_no: 'v3.2',
    doc_changes: 'Updated whistleblower policy section.',
    date_created: '2024-08-12',
    date_modified: '2024-08-12',
    created_by: 'hr.admin',
    modified_by: 'hr.admin',
  },
  {
    id: 'vh-2',
    doc_name: 'Forklift Safety Data Sheet',
    version_no: 'v2.0',
    doc_changes: 'Revised PPE requirements and storage temperature.',
    date_created: '2025-11-20',
    date_modified: '2025-11-20',
    created_by: 'safety.lead',
    modified_by: 'safety.lead',
  },
]

const DEFAULT_FRESHNESS_THRESHOLDS = { currentWithinDays: 365, reviewSoonWithinDays: 730 }
const DEFAULT_THEME_MODE = 'light'
const DEFAULT_THEME_CONFIG = {
  light: {
    appBg: '#f4f7fb',
    headerBg: '#ffffff',
    menuBg: '#e8eef5',
    cardBg: '#ffffff',
    buttonBg: '#004a7c',
    accent: '#0078d4',
  },
  dark: {
    appBg: '#0f172a',
    headerBg: '#111827',
    menuBg: '#0b1324',
    cardBg: '#111827',
    buttonBg: '#004a7c',
    accent: '#38bdf8',
  },
}

function parseJsonArray(input) {
  try {
    const parsed = JSON.parse(String(input || '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseCsv(input) {
  if (!input) return []
  return String(input)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

function rowToDocument(row) {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    issuer: String(row.issuer || ''),
    code: String(row.code || ''),
    revision_date: String(row.revision_date || ''),
    format_type: String(row.format_type || 'pdf'),
    status_badge: String(row.status_badge || 'active'),
    status: String(row.status || 'active'),
    doc_type: String(row.doc_type || ''),
    categories: row.categories_csv ? parseCsv(row.categories_csv) : parseJsonArray(row.categories_json),
    locations: parseJsonArray(row.locations_json),
    notes: String(row.notes || ''),
    hazard_tags: parseJsonArray(row.hazard_tags_json),
    pdf_url: String(row.pdf_url || ''),
    audience: parseJsonArray(row.audience_json),
  }
}

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

  CREATE TABLE IF NOT EXISTS user_categories (
    user_sub     TEXT NOT NULL,
    category_id  TEXT NOT NULL,
    PRIMARY KEY (user_sub, category_id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    issuer          TEXT NOT NULL,
    code            TEXT NOT NULL,
    revision_date   TEXT NOT NULL,
    format_type     TEXT NOT NULL,
    status_badge    TEXT NOT NULL,
    status          TEXT NOT NULL,
    doc_type        TEXT NOT NULL,
    locations_json  TEXT NOT NULL DEFAULT '[]',
    notes           TEXT NOT NULL DEFAULT '',
    hazard_tags_json TEXT NOT NULL DEFAULT '[]',
    pdf_url         TEXT NOT NULL DEFAULT '',
    audience_json   TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_categories (
    document_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    PRIMARY KEY (document_id, category_id)
  );

  CREATE TABLE IF NOT EXISTS document_types (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    date_created  TEXT NOT NULL,
    date_modified TEXT NOT NULL,
    created_by    TEXT NOT NULL,
    modified_by   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_version_history (
    id            TEXT PRIMARY KEY,
    doc_name      TEXT NOT NULL,
    version_no    TEXT NOT NULL,
    doc_changes   TEXT NOT NULL,
    date_created  TEXT NOT NULL,
    date_modified TEXT NOT NULL,
    created_by    TEXT NOT NULL,
    modified_by   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recently_viewed (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    viewed_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    setting_key  TEXT PRIMARY KEY,
    setting_json TEXT NOT NULL
  );
`)

async function insertSeedDocument(doc) {
  const now = new Date().toISOString()
  await db.execute({
    sql: `INSERT OR IGNORE INTO documents
          (id, name, issuer, code, revision_date, format_type, status_badge, status, doc_type, locations_json, notes, hazard_tags_json, pdf_url, audience_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      doc.id,
      doc.name,
      doc.issuer,
      doc.code,
      doc.revision_date,
      doc.format_type,
      doc.status_badge,
      doc.status,
      doc.doc_type,
      JSON.stringify(doc.locations),
      doc.notes,
      JSON.stringify(doc.hazard_tags),
      doc.pdf_url,
      JSON.stringify(doc.audience),
      now,
      now,
    ],
  })

  for (const categoryName of doc.categories) {
    const categoryId = await ensureCategoryByName(categoryName)
    await db.execute({
      sql: 'INSERT OR IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)',
      args: [doc.id, categoryId],
    })
  }
}

// Seed categories if table is empty
{
  const countResult = await db.execute('SELECT COUNT(*) as count FROM categories')
  const catCount = Number(countResult.rows[0][0])
  if (catCount === 0) {
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES (?, ?, ?)',
        args: [`cat-${i + 1}`, DEFAULT_CATEGORIES[i], i],
      })
    }
    console.log('[db] Seeded default categories.')
  }
}

// Seed document library data into Turso and top up category coverage
{
  const docsCountResult = await db.execute('SELECT COUNT(*) as count FROM documents')
  const docsCount = Number(docsCountResult.rows[0][0])

  if (docsCount === 0) {
    for (const doc of SEEDED_DOCUMENTS) {
      await insertSeedDocument(doc)
    }
    console.log('[db] Seeded baseline documents and category links.')
  }

  const categorySeedMap = new Map()
  for (const doc of CATEGORY_SEED_DOCUMENTS) {
    for (const categoryName of doc.categories) {
      const list = categorySeedMap.get(categoryName) || []
      list.push(doc)
      categorySeedMap.set(categoryName, list)
    }
  }

  const minDocsPerCategory = 4
  for (const categoryName of DEFAULT_CATEGORIES) {
    const result = await db.execute({
      sql: `SELECT COUNT(DISTINCT d.id) AS count
            FROM documents d
            INNER JOIN document_categories dc ON dc.document_id = d.id
            INNER JOIN categories c ON c.id = dc.category_id
            WHERE c.name = ?`,
      args: [categoryName],
    })
    const currentCount = Number(result.rows[0][0] || 0)
    const docsToAdd = Math.max(0, minDocsPerCategory - currentCount)
    if (docsToAdd === 0) continue

    const candidates = categorySeedMap.get(categoryName) || []
    for (let i = 0; i < docsToAdd && i < candidates.length; i++) {
      await insertSeedDocument(candidates[i])
    }
  }

  console.log('[db] Ensured minimum document coverage per category.')
}

// Seed document types
{
  const countResult = await db.execute('SELECT COUNT(*) as count FROM document_types')
  const count = Number(countResult.rows[0][0])
  if (count === 0) {
    for (const item of SEEDED_DOCUMENT_TYPES) {
      await db.execute({
        sql: `INSERT INTO document_types (id, name, description, date_created, date_modified, created_by, modified_by)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [item.id, item.name, item.description, item.date_created, item.date_modified, item.created_by, item.modified_by],
      })
    }
    console.log('[db] Seeded document types.')
  }
}

// Seed version history
{
  const countResult = await db.execute('SELECT COUNT(*) as count FROM document_version_history')
  const count = Number(countResult.rows[0][0])
  if (count === 0) {
    for (const item of SEEDED_VERSION_HISTORY) {
      await db.execute({
        sql: `INSERT INTO document_version_history (id, doc_name, version_no, doc_changes, date_created, date_modified, created_by, modified_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [item.id, item.doc_name, item.version_no, item.doc_changes, item.date_created, item.date_modified, item.created_by, item.modified_by],
      })
    }
    console.log('[db] Seeded document version history.')
  }
}

// Seed app settings
{
  await db.execute({
    sql: 'INSERT OR IGNORE INTO app_settings (setting_key, setting_json) VALUES (?, ?)',
    args: ['freshness_thresholds', JSON.stringify(DEFAULT_FRESHNESS_THRESHOLDS)],
  })
  await db.execute({
    sql: 'INSERT OR IGNORE INTO app_settings (setting_key, setting_json) VALUES (?, ?)',
    args: ['theme_config', JSON.stringify(DEFAULT_THEME_CONFIG)],
  })
  await db.execute({
    sql: 'INSERT OR IGNORE INTO app_settings (setting_key, setting_json) VALUES (?, ?)',
    args: ['theme_mode', JSON.stringify(DEFAULT_THEME_MODE)],
  })
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

async function getAppSetting(settingKey, fallbackValue) {
  const result = await db.execute({
    sql: 'SELECT setting_json FROM app_settings WHERE setting_key = ?',
    args: [settingKey],
  })
  if (!result.rows.length) return fallbackValue
  try {
    return JSON.parse(String(result.rows[0][0]))
  } catch {
    return fallbackValue
  }
}

async function setAppSetting(settingKey, value) {
  await db.execute({
    sql: `INSERT INTO app_settings (setting_key, setting_json)
          VALUES (?, ?)
          ON CONFLICT(setting_key) DO UPDATE SET setting_json = excluded.setting_json`,
    args: [settingKey, JSON.stringify(value)],
  })
}

async function listDocumentsForApi() {
  const result = await db.execute(`
    SELECT
      d.*,
      GROUP_CONCAT(c.name) AS categories_csv
    FROM documents d
    LEFT JOIN document_categories dc ON dc.document_id = d.id
    LEFT JOIN categories c ON c.id = dc.category_id
    GROUP BY d.id
    ORDER BY d.updated_at DESC, d.name ASC
  `)
  return rowsToObjs(result).map(rowToDocument)
}

async function buildReminderNotifications(userContext, limit) {
  const [documents, thresholds] = await Promise.all([
    listDocumentsForApi(),
    getAppSetting('freshness_thresholds', DEFAULT_FRESHNESS_THRESHOLDS),
  ])

  const userRole = String(userContext?.user?.role || 'user').toLowerCase()
  const userCategories = new Set((userContext?.categories || []).map((item) => String(item).toLowerCase()))
  const isAdmin = userRole === 'admin'
  const now = Date.now()

  const notifications = documents
    .filter((doc) => {
      if (isAdmin) return true

      const docCategories = (doc.categories || []).map((item) => String(item).toLowerCase())
      const docAudience = (doc.audience || []).map((item) => String(item).toLowerCase())
      const categoryMatch = docCategories.some((category) => userCategories.has(category))
      const roleMatch = docAudience.includes(userRole) || docAudience.includes('all staff')

      return categoryMatch || roleMatch
    })
    .map((doc) => {
      const ageDays = Math.floor((now - new Date(doc.revision_date).getTime()) / (1000 * 60 * 60 * 24))
      let complianceStatus = 'current'
      if (ageDays > thresholds.reviewSoonWithinDays) {
        complianceStatus = 'out-of-date'
      } else if (ageDays > thresholds.currentWithinDays) {
        complianceStatus = 'review-soon'
      }

      if (complianceStatus === 'current') return null

      const severity = complianceStatus === 'out-of-date' ? 'danger' : 'warning'
      const title = complianceStatus === 'out-of-date'
        ? 'Document is out of date'
        : 'Document review due soon'
      const message = complianceStatus === 'out-of-date'
        ? `${doc.name} is ${ageDays} days old and has exceeded the review threshold.`
        : `${doc.name} is ${ageDays} days old and should be reviewed soon.`

      return {
        id: `notif-${doc.id}-${complianceStatus}`,
        document_id: doc.id,
        document_name: doc.name,
        issuer: doc.issuer,
        revision_date: doc.revision_date,
        age_days: ageDays,
        compliance_status: complianceStatus,
        severity,
        title,
        message,
        created_at: doc.revision_date,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'danger' ? -1 : 1
      return b.age_days - a.age_days
    })

  if (typeof limit === 'number') {
    return notifications.slice(0, limit)
  }

  return notifications
}

async function getUserCategories(userSub) {
  const result = await db.execute({
    sql: `SELECT c.name
          FROM user_categories uc
          INNER JOIN categories c ON c.id = uc.category_id
          WHERE uc.user_sub = ?
          ORDER BY c.sort_order, c.name`,
    args: [userSub],
  })
  return rowsToObjs(result).map((row) => String(row.name))
}

async function ensureCategoryByName(name) {
  const cleanName = String(name || '').trim()
  if (!cleanName) return null
  const existing = await db.execute({ sql: 'SELECT id FROM categories WHERE name = ?', args: [cleanName] })
  if (existing.rows.length > 0) return String(existing.rows[0][0])

  const nextOrderResult = await db.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories')
  const nextOrder = Number(nextOrderResult.rows[0][0])
  const categoryId = `cat-${crypto.randomUUID()}`
  await db.execute({
    sql: 'INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)',
    args: [categoryId, cleanName, nextOrder],
  })
  return categoryId
}

async function getAuthenticatedRequestContext(req, cookies) {
  if (DEV_MODE) {
    const devUser = getDevSessionUser(cookies)
    if (!devUser) {
      return { authenticated: false, user: null, dbUser: null, categories: [] }
    }
    const dbUser = await upsertAndGetUser(devUser)
    const categories = await getUserCategories(devUser.sub)
    return {
      authenticated: true,
      user: { ...devUser, role: dbUser?.role || 'user' },
      dbUser,
      categories,
    }
  }

  const profile = buildProfileFromHeaders(req.headers)
  if (!profile.authenticated || !profile.user) {
    return { authenticated: false, user: null, dbUser: null, categories: [] }
  }

  const dbUser = await upsertAndGetUser(profile.user)
  const user = { ...profile.user, role: dbUser?.role || 'user' }
  const categories = await getUserCategories(user.sub)
  return {
    authenticated: true,
    user,
    dbUser,
    categories,
  }
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
    const context = await getAuthenticatedRequestContext(req, cookies)
    if (!context.authenticated || !context.user) {
      sendJson(res, 200, { authenticated: false })
      return
    }

    sendJson(res, 200, {
      authenticated: true,
      user: {
        ...context.user,
        categories: context.categories,
      },
    })
    return
  }

  // Users list
  if (url.pathname === '/api/users' && req.method === 'GET') {
    const result = await db.execute(
      'SELECT sub, given_name, family_name, email, role, created_at, last_login_at FROM users ORDER BY family_name, given_name'
    )
    const users = []
    for (const user of rowsToObjs(result)) {
      users.push({
        ...user,
        categories: await getUserCategories(String(user.sub)),
      })
    }
    sendJson(res, 200, { users })
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

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  // GET /api/documents
  if (url.pathname === '/api/documents' && req.method === 'GET') {
    const result = await db.execute(`
      SELECT
        d.*, 
        GROUP_CONCAT(c.name) AS categories_csv
      FROM documents d
      LEFT JOIN document_categories dc ON dc.document_id = d.id
      LEFT JOIN categories c ON c.id = dc.category_id
      GROUP BY d.id
      ORDER BY d.updated_at DESC, d.name ASC
    `)
    const docs = rowsToObjs(result).map(rowToDocument)
    sendJson(res, 200, { documents: docs })
    return
  }

  // GET /api/documents/:id
  {
    const match = url.pathname.match(/^\/api\/documents\/([^/]+)$/)
    if (match && req.method === 'GET') {
      const id = decodeURIComponent(match[1])
      const result = await db.execute({
        sql: `SELECT d.*, GROUP_CONCAT(c.name) AS categories_csv
              FROM documents d
              LEFT JOIN document_categories dc ON dc.document_id = d.id
              LEFT JOIN categories c ON c.id = dc.category_id
              WHERE d.id = ?
              GROUP BY d.id`,
        args: [id],
      })
      if (!result.rows.length) {
        sendJson(res, 404, { error: 'Document not found' })
        return
      }
      const doc = rowToDocument(rowToObj(result))
      sendJson(res, 200, { document: doc })
      return
    }
  }

  // POST /api/documents (create/update)
  if (url.pathname === '/api/documents' && req.method === 'POST') {
    try {
      const input = await readJsonBody(req)
      const id = String(input.id || `doc-${crypto.randomUUID()}`)
      const now = new Date().toISOString()
      const categories = Array.isArray(input.categories) ? input.categories.map(String) : []
      const locations = Array.isArray(input.locations) ? input.locations.map(String) : []
      const hazardTags = Array.isArray(input.hazard_tags) ? input.hazard_tags.map(String) : []
      const audience = Array.isArray(input.audience) ? input.audience.map(String) : []

      await db.execute({
        sql: `INSERT INTO documents
              (id, name, issuer, code, revision_date, format_type, status_badge, status, doc_type, locations_json, notes, hazard_tags_json, pdf_url, audience_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                issuer = excluded.issuer,
                code = excluded.code,
                revision_date = excluded.revision_date,
                format_type = excluded.format_type,
                status_badge = excluded.status_badge,
                status = excluded.status,
                doc_type = excluded.doc_type,
                locations_json = excluded.locations_json,
                notes = excluded.notes,
                hazard_tags_json = excluded.hazard_tags_json,
                pdf_url = excluded.pdf_url,
                audience_json = excluded.audience_json,
                updated_at = excluded.updated_at`,
        args: [
          id,
          String(input.name || ''),
          String(input.issuer || ''),
          String(input.code || ''),
          String(input.revision_date || ''),
          String(input.format_type || 'pdf'),
          String(input.status_badge || 'active'),
          String(input.status || 'active'),
          String(input.doc_type || ''),
          JSON.stringify(locations),
          String(input.notes || ''),
          JSON.stringify(hazardTags),
          String(input.pdf_url || ''),
          JSON.stringify(audience),
          now,
          now,
        ],
      })

      await db.execute({ sql: 'DELETE FROM document_categories WHERE document_id = ?', args: [id] })
      for (const categoryName of categories) {
        const categoryId = await ensureCategoryByName(categoryName)
        if (!categoryId) continue
        await db.execute({
          sql: 'INSERT OR IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)',
          args: [id, categoryId],
        })
      }

      const result = await db.execute({
        sql: `SELECT d.*, GROUP_CONCAT(c.name) AS categories_csv
              FROM documents d
              LEFT JOIN document_categories dc ON dc.document_id = d.id
              LEFT JOIN categories c ON c.id = dc.category_id
              WHERE d.id = ?
              GROUP BY d.id`,
        args: [id],
      })
      sendJson(res, 200, { document: rowToDocument(rowToObj(result)) })
    } catch {
      sendJson(res, 400, { error: 'Bad request' })
    }
    return
  }

  // DELETE /api/documents/:id
  {
    const match = url.pathname.match(/^\/api\/documents\/([^/]+)$/)
    if (match && req.method === 'DELETE') {
      const id = decodeURIComponent(match[1])
      await db.execute({ sql: 'DELETE FROM document_categories WHERE document_id = ?', args: [id] })
      await db.execute({ sql: 'DELETE FROM documents WHERE id = ?', args: [id] })
      sendJson(res, 200, { deleted: id })
      return
    }
  }

  // GET /api/document-types
  if (url.pathname === '/api/document-types' && req.method === 'GET') {
    const result = await db.execute('SELECT * FROM document_types ORDER BY name')
    sendJson(res, 200, { documentTypes: rowsToObjs(result) })
    return
  }

  // GET /api/version-history
  if (url.pathname === '/api/version-history' && req.method === 'GET') {
    const result = await db.execute('SELECT * FROM document_version_history ORDER BY date_modified DESC')
    sendJson(res, 200, { versionHistory: rowsToObjs(result) })
    return
  }

  // GET /api/recently-viewed
  if (url.pathname === '/api/recently-viewed' && req.method === 'GET') {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)))
    const result = await db.execute({
      sql: `SELECT document_id AS id, MAX(viewed_at) AS viewed_at
            FROM recently_viewed
            GROUP BY document_id
            ORDER BY viewed_at DESC
            LIMIT ?`,
      args: [limit],
    })
    sendJson(res, 200, { items: rowsToObjs(result) })
    return
  }

  // POST /api/recently-viewed
  if (url.pathname === '/api/recently-viewed' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const documentId = String(body.id || '').trim()
      if (!documentId) {
        sendJson(res, 400, { error: 'id is required' })
        return
      }
      await db.execute({
        sql: 'INSERT INTO recently_viewed (document_id, viewed_at) VALUES (?, ?)',
        args: [documentId, new Date().toISOString()],
      })
      sendJson(res, 201, { ok: true })
    } catch {
      sendJson(res, 400, { error: 'Bad request' })
    }
    return
  }

  // GET /api/notifications
  if (url.pathname === '/api/notifications' && req.method === 'GET') {
    const rawLimit = url.searchParams.get('limit')
    const limit = rawLimit ? Math.max(1, Math.min(50, Number(rawLimit))) : undefined
    const context = await getAuthenticatedRequestContext(req, cookies)
    const notifications = await buildReminderNotifications(context, Number.isFinite(limit) ? limit : undefined)
    sendJson(res, 200, { notifications })
    return
  }

  // ---------------------------------------------------------------------------
  // App settings
  // ---------------------------------------------------------------------------

  if (url.pathname === '/api/settings/freshness-thresholds' && req.method === 'GET') {
    const value = await getAppSetting('freshness_thresholds', DEFAULT_FRESHNESS_THRESHOLDS)
    sendJson(res, 200, value)
    return
  }

  if (url.pathname === '/api/settings/freshness-thresholds' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const value = {
        currentWithinDays: Number(body.currentWithinDays || 0),
        reviewSoonWithinDays: Number(body.reviewSoonWithinDays || 0),
      }
      await setAppSetting('freshness_thresholds', value)
      sendJson(res, 200, value)
    } catch {
      sendJson(res, 400, { error: 'Bad request' })
    }
    return
  }

  if (url.pathname === '/api/settings/theme-config' && req.method === 'GET') {
    const value = await getAppSetting('theme_config', DEFAULT_THEME_CONFIG)
    sendJson(res, 200, value)
    return
  }

  if (url.pathname === '/api/settings/theme-config' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      await setAppSetting('theme_config', body)
      sendJson(res, 200, body)
    } catch {
      sendJson(res, 400, { error: 'Bad request' })
    }
    return
  }

  if (url.pathname === '/api/settings/theme-mode' && req.method === 'GET') {
    const value = await getAppSetting('theme_mode', DEFAULT_THEME_MODE)
    sendJson(res, 200, { mode: value === 'dark' ? 'dark' : 'light' })
    return
  }

  if (url.pathname === '/api/settings/theme-mode' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const mode = body.mode === 'dark' ? 'dark' : 'light'
      await setAppSetting('theme_mode', mode)
      sendJson(res, 200, { mode })
    } catch {
      sendJson(res, 400, { error: 'Bad request' })
    }
    return
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
