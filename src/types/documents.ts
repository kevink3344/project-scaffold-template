export type DocumentStatusBadge = 'active' | 'archived' | 'draft'
export type DocumentFormatType = 'pdf' | 'paper' | 'hybrid'

export interface DocumentListRecord {
  id: string
  name: string
  issuer: string
  code: string
  revision_date: string
  format_type: DocumentFormatType
  status_badge: DocumentStatusBadge
  status: 'active' | 'archived'
  doc_type: string
  categories: string[]
  locations: string[]
  notes: string
  hazard_tags: string[]
  pdf_url: string
  audience: string[]
}

export interface DocumentVersionHistoryRecord {
  id: string
  doc_name: string
  version_no: string
  doc_changes: string
  date_created: string
  date_modified: string
  created_by: string
  modified_by: string
}

export interface DocumentTypeRecord {
  id: string
  name: string
  description: string
  date_created: string
  date_modified: string
  created_by: string
  modified_by: string
}

export interface RecentlyViewedItem {
  id: string
  viewed_at: string
}

export interface FreshnessThresholds {
  currentWithinDays: number
  reviewSoonWithinDays: number
}

export type ComplianceStatus = 'current' | 'review-soon' | 'out-of-date'

export interface ThemePalette {
  appBg: string
  headerBg: string
  menuBg: string
  cardBg: string
  buttonBg: string
  accent: string
}

export interface ThemeConfig {
  light: ThemePalette
  dark: ThemePalette
}
