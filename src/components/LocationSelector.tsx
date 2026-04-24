import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Location {
  id: number
  name: string
}

interface LocationSelectorProps {
  selectedLocations: string[]
  onSelectChange: (locations: string[]) => void
}

export function LocationSelector({ selectedLocations, onSelectChange }: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchLocations() {
      try {
        setIsLoading(true)
        setError(null)

        // Use backend endpoint to avoid CORS issues
        const response = await fetch('/api/locations')

        if (!response.ok) {
          throw new Error(`Failed to fetch locations: ${response.statusText}`)
        }

        const data = await response.json() as { locations: Location[] }

        if (!Array.isArray(data.locations)) {
          throw new Error('Invalid response format: expected locations array')
        }

        if (!isMounted) return

        if (data.locations.length === 0) {
          console.warn('No valid locations found in response')
        }

        setLocations(data.locations)
      } catch (err) {
        if (!isMounted) return
        const errorMsg = err instanceof Error ? err.message : 'Failed to load locations'
        setError(errorMsg)
        console.error('Error fetching locations:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchLocations()

    return () => {
      isMounted = false
    }
  }, [])

  function toggleLocation(locationName: string) {
    if (selectedLocations.includes(locationName)) {
      onSelectChange(selectedLocations.filter(loc => loc !== locationName))
    } else {
      onSelectChange([...selectedLocations, locationName])
    }
  }

  function selectAllLocations() {
    const allLocationNames = locations.map(loc => loc.name)
    onSelectChange(allLocationNames)
  }

  function clearAllLocations() {
    onSelectChange([])
  }

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between rounded-[3px] border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>
          Locations
          {selectedLocations.length > 0 && (
            <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
              {selectedLocations.length}
            </span>
          )}
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {selectedLocations.length > 0 && (
        <div className="rounded-[3px] border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">Selected Locations ({selectedLocations.length}):</p>
          <div className="flex flex-wrap gap-1">
            {selectedLocations.map(location => (
              <span
                key={location}
                className="inline-flex items-center gap-1 rounded-[3px] bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-900"
              >
                {location}
                <button
                  type="button"
                  onClick={() => toggleLocation(location)}
                  className="ml-1 text-blue-700 hover:text-blue-900 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="rounded-[3px] border border-slate-300 bg-slate-50 p-3 space-y-2">
          {isLoading && <p className="text-sm text-slate-600">Loading locations...</p>}

          {error && (
            <div className="rounded-[3px] border border-red-300 bg-red-50 p-2">
              <p className="text-sm font-semibold text-red-700">Error loading locations:</p>
              <p className="text-xs text-red-600 mt-1 font-mono break-words">{error}</p>
              <p className="text-xs text-red-600 mt-2">Check browser console (F12) for more details.</p>
            </div>
          )}

          {!isLoading && !error && locations.length === 0 && (
            <p className="text-sm text-slate-600">No locations available</p>
          )}

          {!isLoading && !error && locations.length > 0 && (
            <>
              <input
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[3px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllLocations}
                  className="flex-1 rounded-[3px] border border-blue-500 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllLocations}
                  className="flex-1 rounded-[3px] border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-64 overflow-y-auto">
                {filteredLocations.length === 0 && (
                  <p className="text-xs text-slate-500 col-span-full">No locations match "{searchQuery}"</p>
                )}
                {filteredLocations.map(location => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => toggleLocation(location.name)}
                    className={`rounded-[3px] border px-2 py-1 text-sm text-left transition-colors ${
                      selectedLocations.includes(location.name)
                        ? 'border-blue-500 bg-blue-100 text-blue-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {location.name}
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
