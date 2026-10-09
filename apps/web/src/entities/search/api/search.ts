import { http } from '@/shared/api'
import { searchDtoSchema, toSearchResult } from './search-schema.ts'
import type { SearchResult } from './search-schema.ts'

export async function search(q: string, signal?: AbortSignal): Promise<SearchResult> {
  const page = await http.get('/v1/search', searchDtoSchema, { query: { q }, signal })
  return toSearchResult(page)
}
