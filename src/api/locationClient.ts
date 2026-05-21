import type { LocationNode } from '../locations/location.schemas'

const API_BASE = '/api'

export class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface LocationByIdResponse {
  status?: string
  data?: {
    location?: LocationNode | null
  }
}

export async function fetchLocationById(id: string): Promise<LocationNode | null> {
  const response = await fetch(`${API_BASE}/locations/${id}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new HttpError(
      `Request failed with ${response.status}: ${text || response.statusText}`,
      response.status,
    )
  }

  const json = (await response.json()) as LocationByIdResponse | LocationNode

  // Handle both wrapped and direct payload shapes.
  if ('data' in (json as LocationByIdResponse)) {
    return (json as LocationByIdResponse).data?.location ?? null
  }

  return json as LocationNode
}
