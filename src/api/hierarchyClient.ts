import type {
    LocationHierarchyResponseDto,
    LocationNode,
} from '../locations/location.schemas'
  
  /**
   * Base path for backend API calls.
   * Uses same-origin `/api` by default so dev/prod work with proxies.
   */
  const API_BASE = '/api'
  
  async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    })
  
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(
        `Request to ${path} failed with ${response.status}: ${
          text || response.statusText
        }`,
      )
    }
  
    const json = (await response.json()) as unknown
    return json as T
  }
  
  /**
   * Strictly typed client for GET /api/hierarchy.
   * Returns the parsed `LocationNode[]` tree.
   */
  export async function fetchLocationHierarchy(): Promise<LocationNode[]> {
    const payload = await fetchJson<LocationHierarchyResponseDto>('/hierarchy')
  
    if (!payload.success) {
      throw new Error('Hierarchy request did not succeed')
    }
  
    return payload.data
  }
  