import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Department {
  id: string
  name: string
}

interface DepartmentSelectorProps {
  selectedDepartments: string[]
  onSelectChange: (departments: string[]) => void
}

export function DepartmentSelector({ selectedDepartments, onSelectChange }: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchDepartments() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/departments')

        if (!response.ok) {
          throw new Error(`Failed to fetch departments: ${response.statusText}`)
        }

        const data = await response.json() as { departments: Department[] }

        if (!Array.isArray(data.departments)) {
          throw new Error('Invalid response format: expected departments array')
        }

        if (!isMounted) return

        if (data.departments.length === 0) {
          console.warn('No valid departments found in response')
        }

        setDepartments(data.departments)
      } catch (err) {
        if (!isMounted) return
        const errorMsg = err instanceof Error ? err.message : 'Failed to load departments'
        setError(errorMsg)
        console.error('Error fetching departments:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchDepartments()

    return () => {
      isMounted = false
    }
  }, [])

  function toggleDepartment(departmentName: string) {
    if (selectedDepartments.includes(departmentName)) {
      onSelectChange(selectedDepartments.filter(dep => dep !== departmentName))
    } else {
      onSelectChange([...selectedDepartments, departmentName])
    }
  }

  function selectAllDepartments() {
    const allDepartmentNames = departments.map(dep => dep.name)
    onSelectChange(allDepartmentNames)
  }

  function clearAllDepartments() {
    onSelectChange([])
  }

  const filteredDepartments = departments.filter(department =>
    department.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between rounded-[3px] border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>
          Departments
          {selectedDepartments.length > 0 && (
            <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
              {selectedDepartments.length}
            </span>
          )}
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {selectedDepartments.length > 0 && (
        <div className="rounded-[3px] border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">Selected Departments ({selectedDepartments.length}):</p>
          <div className="flex flex-wrap gap-1">
            {selectedDepartments.map(department => (
              <span
                key={department}
                className="inline-flex items-center gap-1 rounded-[3px] bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-900"
              >
                {department}
                <button
                  type="button"
                  onClick={() => toggleDepartment(department)}
                  className="ml-1 text-blue-700 hover:text-blue-900 font-bold"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="rounded-[3px] border border-slate-300 bg-slate-50 p-3 space-y-2">
          {isLoading && <p className="text-sm text-slate-600">Loading departments...</p>}

          {error && (
            <div className="rounded-[3px] border border-red-300 bg-red-50 p-2">
              <p className="text-sm font-semibold text-red-700">Error loading departments:</p>
              <p className="text-xs text-red-600 mt-1 font-mono break-words">{error}</p>
            </div>
          )}

          {!isLoading && !error && departments.length === 0 && (
            <p className="text-sm text-slate-600">No departments available</p>
          )}

          {!isLoading && !error && departments.length > 0 && (
            <>
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[3px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllDepartments}
                  className="flex-1 rounded-[3px] border border-blue-500 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllDepartments}
                  className="flex-1 rounded-[3px] border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-64 overflow-y-auto">
                {filteredDepartments.length === 0 && (
                  <p className="text-xs text-slate-500 col-span-full">No departments match "{searchQuery}"</p>
                )}
                {filteredDepartments.map(department => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => toggleDepartment(department.name)}
                    className={`rounded-[3px] border px-2 py-1 text-sm text-left transition-colors ${
                      selectedDepartments.includes(department.name)
                        ? 'border-blue-500 bg-blue-100 text-blue-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {department.name}
                  </button>
                ))}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  )
}
