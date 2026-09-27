export type LocationItem = {
  id: string
  name: string
  location_type: string
  parent_id: string | null
}

export function buildLocationPath(
  locationId: string | null,
  locations: LocationItem[]
) {
  if (!locationId) return ''

  const parts: string[] = []
  let currentId: string | null = locationId
  const visited = new Set<string>()

  while (currentId) {
    if (visited.has(currentId)) break
    visited.add(currentId)

    const current = locations.find(
      (location) => location.id === currentId
    )

    if (!current) break

    parts.unshift(current.name)
    currentId = current.parent_id
  }

  return parts.join(' → ')
}
