import type {
  ActivityLogEntry,
  ComplianceStatus,
  DocumentListRecord,
  DocumentTypeRecord,
  DocumentVersionHistoryRecord,
  FreshnessThresholds,
  ReminderNotification,
  RecentlyViewedItem,
  ThemeConfig,
} from '../types/documents'

export const DEFAULT_CATEGORIES = ['HR', 'Finance', 'Operations', 'Legal', 'Safety', 'Training']

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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

export async function getDocuments(): Promise<DocumentListRecord[]> {
  try {
    const payload = await fetchJson<{ documents: DocumentListRecord[] }>('/api/documents')
    return Array.isArray(payload.documents) ? payload.documents : []
  } catch {
    return []
  }
}

export async function getDocumentById(id: string): Promise<DocumentListRecord | null> {
  try {
    const payload = await fetchJson<{ document: DocumentListRecord }>(`/api/documents/${encodeURIComponent(id)}`)
    return payload.document ?? null
  } catch {
    return null
  }
}

export async function upsertDocument(input: DocumentListRecord): Promise<DocumentListRecord> {
  const payload = await fetchJson<{ document: DocumentListRecord }>('/api/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return payload.document
}

export async function deleteDocument(id: string): Promise<void> {
  await fetchJson(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getDocumentTypes(): Promise<DocumentTypeRecord[]> {
  try {
    const payload = await fetchJson<{ documentTypes: DocumentTypeRecord[] }>('/api/document-types')
    return Array.isArray(payload.documentTypes) ? payload.documentTypes : []
  } catch {
    return []
  }
}

export async function getVersionHistory(): Promise<DocumentVersionHistoryRecord[]> {
  try {
    const payload = await fetchJson<{ versionHistory: DocumentVersionHistoryRecord[] }>('/api/version-history')
    return Array.isArray(payload.versionHistory) ? payload.versionHistory : []
  } catch {
    return []
  }
}

export async function getRecentlyViewed(limit = 20): Promise<RecentlyViewedItem[]> {
  try {
    const payload = await fetchJson<{ items: RecentlyViewedItem[] }>(`/api/recently-viewed?limit=${limit}`)
    return Array.isArray(payload.items) ? payload.items : []
  } catch {
    return []
  }
}

export async function getReminderNotifications(limit?: number): Promise<ReminderNotification[]> {
  try {
    const suffix = typeof limit === 'number' ? `?limit=${limit}` : ''
    const payload = await fetchJson<{ notifications: ReminderNotification[] }>(`/api/notifications${suffix}`)
    return Array.isArray(payload.notifications) ? payload.notifications : []
  } catch {
    return []
  }
}

export async function getActivityLog(documentId?: string, limit = 50): Promise<ActivityLogEntry[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (documentId) params.set('documentId', documentId)
    const payload = await fetchJson<{ entries: ActivityLogEntry[] }>(`/api/activity-log?${params}`)
    return Array.isArray(payload.entries) ? payload.entries : []
  } catch {
    return []
  }
}

export async function addActivityEntry(
  documentId: string,
  action: ActivityLogEntry['action'],
  note = '',
): Promise<void> {
  await fetchJson('/api/activity-log', {
    method: 'POST',
    body: JSON.stringify({ document_id: documentId, action, note }),
  })
}

export async function trackRecentlyViewed(id: string): Promise<void> {
  await fetchJson('/api/recently-viewed', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function getFreshnessThresholds(): Promise<FreshnessThresholds> {
  try {
    return await fetchJson<FreshnessThresholds>('/api/settings/freshness-thresholds')
  } catch {
    return { currentWithinDays: 365, reviewSoonWithinDays: 730 }
  }
}

export async function setFreshnessThresholds(thresholds: FreshnessThresholds): Promise<void> {
  await fetchJson('/api/settings/freshness-thresholds', {
    method: 'POST',
    body: JSON.stringify(thresholds),
  })
}

export function getComplianceStatus(item: DocumentListRecord, thresholds?: FreshnessThresholds): ComplianceStatus {
  const activeThresholds = thresholds ?? { currentWithinDays: 365, reviewSoonWithinDays: 730 }
  const revisionDate = new Date(item.revision_date)
  const diffMs = Date.now() - revisionDate.getTime()
  const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (ageDays <= activeThresholds.currentWithinDays) return 'current'
  if (ageDays <= activeThresholds.reviewSoonWithinDays) return 'review-soon'
  return 'out-of-date'
}

export async function getThemeConfig(): Promise<ThemeConfig> {
  try {
    return await fetchJson<ThemeConfig>('/api/settings/theme-config')
  } catch {
    return defaultThemeConfig
  }
}

export async function setThemeConfig(themeConfig: ThemeConfig): Promise<void> {
  await fetchJson('/api/settings/theme-config', {
    method: 'POST',
    body: JSON.stringify(themeConfig),
  })
}

export async function getThemeMode(): Promise<'light' | 'dark'> {
  try {
    const payload = await fetchJson<{ mode: 'light' | 'dark' }>('/api/settings/theme-mode')
    return payload.mode === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export async function setThemeMode(mode: 'light' | 'dark'): Promise<void> {
  await fetchJson('/api/settings/theme-mode', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  })
}
