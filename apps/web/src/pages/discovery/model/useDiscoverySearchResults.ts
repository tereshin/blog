import type { SearchResult } from '@/entities/search'

export function useDiscoverySearchResults(pages: SearchResult[]) {
  const articles = pages.flatMap((page) => page.articles)
  const people = pages[0]?.people ?? []
  const topics = pages[0]?.topics ?? []
  return { articles, people, topics }
}
