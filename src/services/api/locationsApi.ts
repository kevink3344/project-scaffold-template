export interface LocationRecord {
  id: number
  name: string
  created_at: string
}

export async function fetchLocations(): Promise<LocationRecord[]> {
  const res = await fetch('/api/locations')
  if (!res.ok) {
    throw new Error(`Failed to fetch locations (${res.status})`)
  }
  const data = await res.json() as { locations?: LocationRecord[] }
  return Array.isArray(data.locations) ? data.locations : []
}

export async function createLocation(name: string): Promise<LocationRecord> {
  const res = await fetch('/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to create location')
  }
  const data = await res.json() as { location: LocationRecord }
  return data.location
}

export async function updateLocation(id: number, name: string): Promise<LocationRecord> {
  const res = await fetch(`/api/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to update location')
  }
  const data = await res.json() as { location: LocationRecord }
  return data.location
}

export async function deleteLocation(id: number): Promise<void> {
  const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('Failed to delete location')
  }
}