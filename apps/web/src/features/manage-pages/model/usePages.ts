import { useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { listPages, pageKeys } from '@/entities/page'
export function usePages() {
  const [params, setParams] = useSearchParams()
  const status = ['draft', 'published'].includes(params.get('status') ?? '')
    ? (params.get('status') ?? 'all')
    : 'all'
  const query = useInfiniteQuery({
    queryKey: pageKeys.list(status),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      listPages(
        {
          limit: 20,
          ...(status === 'draft' || status === 'published' ? { status } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
        signal,
      ),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  })
  return {
    query,
    status,
    setStatus: (value: string) => setParams(value === 'all' ? {} : { status: value }),
    rows: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}
