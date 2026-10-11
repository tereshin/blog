import { useQuery } from '@tanstack/react-query'
import { getPageSeo } from '../api/get-page-seo.ts'

export const seoKeys = { all: ['seo'] as const, page: (path: string) => ['seo', path] as const }
export function usePageSeo(path: string) {
  return useQuery({ queryKey: seoKeys.page(path), queryFn: ({ signal }) => getPageSeo(path, signal), staleTime: 30_000, refetchInterval: (query) => query.state.data?.cover_pending ? 5_000 : false })
}
