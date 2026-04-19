import { useEffect, useState } from 'react'
import { fetchCategories, type CategoryRecord } from '../services/api/categoriesApi'

const FALLBACK_NAMES = ['HR', 'Finance', 'Operations', 'Legal', 'Safety', 'Training']

export function useCategories(): string[] {
  const [names, setNames] = useState<string[]>(FALLBACK_NAMES)

  useEffect(() => {
    fetchCategories()
      .then((records: CategoryRecord[]) => setNames(records.map(r => r.name)))
      .catch(() => {})
  }, [])

  return names
}
