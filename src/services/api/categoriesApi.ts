export interface CategoryRecord {
  id: string
  name: string
  sort_order: number
}

const FALLBACK_CATEGORIES: CategoryRecord[] = [
  { id: 'cat-1', name: 'HR', sort_order: 0 },
  { id: 'cat-2', name: 'Finance', sort_order: 1 },
  { id: 'cat-3', name: 'Operations', sort_order: 2 },
  { id: 'cat-4', name: 'Legal', sort_order: 3 },
  { id: 'cat-5', name: 'Safety', sort_order: 4 },
  { id: 'cat-6', name: 'Training', sort_order: 5 },
]

export async function fetchCategories(): Promise<CategoryRecord[]> {
  try {
    const res = await fetch('/api/categories')
    if (!res.ok) return FALLBACK_CATEGORIES
    const data = await res.json() as { categories: CategoryRecord[] }
    return Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories
      : FALLBACK_CATEGORIES
  } catch {
    return FALLBACK_CATEGORIES
  }
}

export async function createCategory(name: string): Promise<CategoryRecord> {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to create category')
  }
  return res.json() as Promise<CategoryRecord>
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete category')
}
