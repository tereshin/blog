import { useSearchParams } from 'react-router'
import { moderationFiltersSchema } from '@blog/contracts'
export function useModerationFilters() {
  const [params, setParams] = useSearchParams()
  const parsed = moderationFiltersSchema.safeParse(Object.fromEntries(params))
  const filters = parsed.success ? parsed.data : moderationFiltersSchema.parse({})
  const setFilter = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete('cursor')
        return next
      },
      { replace: true },
    )
  return { filters, setFilter }
}
