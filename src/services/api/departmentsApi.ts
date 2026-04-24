export interface DepartmentRecord {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export async function fetchDepartments(): Promise<DepartmentRecord[]> {
  const res = await fetch('/api/departments')
  if (!res.ok) {
    throw new Error(`Failed to fetch departments (${res.status})`)
  }
  const data = await res.json() as { departments?: DepartmentRecord[] }
  return Array.isArray(data.departments) ? data.departments : []
}

export async function createDepartment(name: string): Promise<DepartmentRecord> {
  const res = await fetch('/api/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to create department')
  }
  return res.json() as Promise<DepartmentRecord>
}

export async function updateDepartment(id: string, name: string): Promise<DepartmentRecord> {
  const res = await fetch(`/api/departments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to update department')
  }
  return res.json() as Promise<DepartmentRecord>
}

export async function deleteDepartment(id: string): Promise<void> {
  const res = await fetch(`/api/departments/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('Failed to delete department')
  }
}
