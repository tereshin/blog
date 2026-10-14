import { useRating } from '@/entities/user'

export function useDiscoveryBlogs() {
  const rating = useRating()
  const people = (rating.data?.pages ?? []).flatMap((page) => page.items)
  return { rating, people }
}
