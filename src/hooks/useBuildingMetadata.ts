import { useQuery } from '@tanstack/react-query'
import { fetchLocationById } from '../api/locationClient'

export function useBuildingMetadata(id: string | null) {
  return useQuery({
    queryKey: ['building', id],
    queryFn: () => fetchLocationById(id as string),
    enabled: !!id,
  })
}
