import type {
  ComplianceStatus,
  DocumentListRecord,
  DocumentTypeRecord,
  DocumentVersionHistoryRecord,
  FreshnessThresholds,
  RecentlyViewedItem,
  ThemeConfig,
} from '../types/documents'

const DOCS_KEY = 'document-library-docs-v1'
const RECENT_KEY = 'document-library-recent-v1'
const FRESHNESS_KEY = 'document-library-freshness-v1'
const THEME_KEY = 'document-library-theme-v1'
const MODE_KEY = 'document-library-theme-mode-v1'

export const DEFAULT_CATEGORIES = ['HR', 'Finance', 'Operations', 'Legal', 'Safety', 'Training']

const seededDocuments: DocumentListRecord[] = [
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

const seededDocTypes: DocumentTypeRecord[] = [
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

const seededVersionHistory: DocumentVersionHistoryRecord[] = [
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

export const defaultThemeConfig: ThemeConfig = {
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

export function getDocuments(): DocumentListRecord[] {
  const raw = localStorage.getItem(DOCS_KEY)
  if (!raw) {
    localStorage.setItem(DOCS_KEY, JSON.stringify(seededDocuments))
    return seededDocuments
  }

  try {
    const parsed = JSON.parse(raw) as DocumentListRecord[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seededDocuments
    return parsed
  } catch {
    return seededDocuments
  }
}

export function saveDocuments(items: DocumentListRecord[]): void {
  localStorage.setItem(DOCS_KEY, JSON.stringify(items))
}

export function getDocumentById(id: string): DocumentListRecord | null {
  return getDocuments().find(item => item.id === id) ?? null
}

export function upsertDocument(input: DocumentListRecord): void {
  const current = getDocuments()
  const idx = current.findIndex(item => item.id === input.id)
  if (idx >= 0) {
    current[idx] = input
  } else {
    current.unshift(input)
  }
  saveDocuments(current)
}

export function deleteDocument(id: string): void {
  const next = getDocuments().filter(item => item.id !== id)
  saveDocuments(next)
}

export function getDocumentTypes(): DocumentTypeRecord[] {
  return seededDocTypes
}

export function getVersionHistory(): DocumentVersionHistoryRecord[] {
  return seededVersionHistory
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  const raw = localStorage.getItem(RECENT_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as RecentlyViewedItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function trackRecentlyViewed(id: string): void {
  const current = getRecentlyViewed().filter(item => item.id !== id)
  const next: RecentlyViewedItem[] = [{ id, viewed_at: new Date().toISOString() }, ...current].slice(0, 20)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export function getFreshnessThresholds(): FreshnessThresholds {
  const raw = localStorage.getItem(FRESHNESS_KEY)
  if (!raw) {
    const defaults: FreshnessThresholds = { currentWithinDays: 365, reviewSoonWithinDays: 730 }
    localStorage.setItem(FRESHNESS_KEY, JSON.stringify(defaults))
    return defaults
  }

  try {
    const parsed = JSON.parse(raw) as FreshnessThresholds
    if (typeof parsed.currentWithinDays !== 'number' || typeof parsed.reviewSoonWithinDays !== 'number') {
      return { currentWithinDays: 365, reviewSoonWithinDays: 730 }
    }
    return parsed
  } catch {
    return { currentWithinDays: 365, reviewSoonWithinDays: 730 }
  }
}

export function setFreshnessThresholds(thresholds: FreshnessThresholds): void {
  localStorage.setItem(FRESHNESS_KEY, JSON.stringify(thresholds))
}

export function getComplianceStatus(item: DocumentListRecord, thresholds?: FreshnessThresholds): ComplianceStatus {
  const activeThresholds = thresholds ?? getFreshnessThresholds()
  const revisionDate = new Date(item.revision_date)
  const diffMs = Date.now() - revisionDate.getTime()
  const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (ageDays <= activeThresholds.currentWithinDays) return 'current'
  if (ageDays <= activeThresholds.reviewSoonWithinDays) return 'review-soon'
  return 'out-of-date'
}

export function getThemeConfig(): ThemeConfig {
  const raw = localStorage.getItem(THEME_KEY)
  if (!raw) {
    localStorage.setItem(THEME_KEY, JSON.stringify(defaultThemeConfig))
    return defaultThemeConfig
  }

  try {
    const parsed = JSON.parse(raw) as ThemeConfig
    if (!parsed.light || !parsed.dark) return defaultThemeConfig
    return parsed
  } catch {
    return defaultThemeConfig
  }
}

export function setThemeConfig(themeConfig: ThemeConfig): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(themeConfig))
}

export function getThemeMode(): 'light' | 'dark' {
  return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light'
}

export function setThemeMode(mode: 'light' | 'dark'): void {
  localStorage.setItem(MODE_KEY, mode)
}
