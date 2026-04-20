export interface DocumentTypeRecord {
  id: string
  name: string
  description: string
  date_created: string
  date_modified: string
  created_by: string
  modified_by: string
}

const FALLBACK_DOCUMENT_TYPES: DocumentTypeRecord[] = [
  {
    id: 'dt-1',
    name: 'Safety Data Sheet',
    description: 'Documents containing safety information about hazardous materials',
    date_created: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
    created_by: 'system',
    modified_by: 'system',
  },
  {
    id: 'dt-2',
    name: 'Procedure Manual',
    description: 'Step-by-step instructions for processes and operations',
    date_created: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
    created_by: 'system',
    modified_by: 'system',
  },
  {
    id: 'dt-3',
    name: 'Policy Document',
    description: 'Organizational policies and guidelines',
    date_created: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
    created_by: 'system',
    modified_by: 'system',
  },
]

export async function fetchDocumentTypes(): Promise<DocumentTypeRecord[]> {
  try {
    const res = await fetch('/api/document-types')
    if (!res.ok) return FALLBACK_DOCUMENT_TYPES
    const data = await res.json() as { documentTypes: DocumentTypeRecord[] }
    return Array.isArray(data.documentTypes) && data.documentTypes.length > 0
      ? data.documentTypes
      : FALLBACK_DOCUMENT_TYPES
  } catch {
    return FALLBACK_DOCUMENT_TYPES
  }
}

export async function createDocumentType(name: string, description: string): Promise<DocumentTypeRecord> {
  const res = await fetch('/api/document-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to create document type')
  }
  return res.json() as Promise<DocumentTypeRecord>
}

export async function updateDocumentType(id: string, name: string, description: string): Promise<DocumentTypeRecord> {
  const res = await fetch(`/api/document-types/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to update document type')
  }
  return res.json() as Promise<DocumentTypeRecord>
}

export async function deleteDocumentType(id: string): Promise<void> {
  const res = await fetch(`/api/document-types/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete document type')
}