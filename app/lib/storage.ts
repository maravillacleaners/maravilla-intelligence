// Filter storage management (localStorage-backed)

export interface SavedFilter {
  id: string
  name: string
  table: 'leads' | 'contacts' | 'opportunities'
  filters: Record<string, any>
  createdAt: string
  lastUsedAt?: string
}

const STORAGE_KEY = 'maravilla_saved_filters'

export function getSavedFilters(): SavedFilter[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveFilter(table: 'leads' | 'contacts' | 'opportunities', name: string, filters: Record<string, any>): SavedFilter {
  const saved = getSavedFilters()
  const id = `filter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const newFilter: SavedFilter = {
    id,
    name,
    table,
    filters,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  }
  saved.push(newFilter)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  return newFilter
}

export function updateFilter(id: string, name?: string, filters?: Record<string, any>): SavedFilter | null {
  const saved = getSavedFilters()
  const idx = saved.findIndex((f) => f.id === id)
  if (idx === -1) return null

  const filter = saved[idx]
  if (name) filter.name = name
  if (filters) filter.filters = filters
  filter.lastUsedAt = new Date().toISOString()

  saved[idx] = filter
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  return filter
}

export function deleteFilter(id: string): boolean {
  const saved = getSavedFilters()
  const filtered = saved.filter((f) => f.id !== id)
  if (filtered.length === saved.length) return false

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}

export function getFiltersByTable(table: 'leads' | 'contacts' | 'opportunities'): SavedFilter[] {
  return getSavedFilters().filter((f) => f.table === table).sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
    return bTime - aTime
  })
}
