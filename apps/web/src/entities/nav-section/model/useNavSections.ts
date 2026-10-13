import { useQuery } from '@tanstack/react-query'
import { getNavSections, navSectionKeys } from '../api/nav-sections.ts'

export function useNavSections() {
  return useQuery({
    queryKey: navSectionKeys.public(),
    queryFn: ({ signal }) => getNavSections(signal),
    staleTime: 60_000,
  })
}
