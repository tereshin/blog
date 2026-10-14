import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminPage, pageKeys } from '@/entities/page'
import type { AdminPage } from '@/entities/page'
import { useViewer } from '@/entities/session'

export function usePageEditor(id?: string) {
  const { is_superadmin } = useViewer()
  const query = useQuery({
    queryKey: pageKeys.admin(id ?? 'new'),
    queryFn: ({ signal }) => getAdminPage(id ?? '', signal),
    enabled: Boolean(id) && is_superadmin,
    retry: false,
  })
  const [opened, setOpened] = useState<{ initial: AdminPage | null } | null>(null)
  useEffect(() => {
    if (!opened && is_superadmin && (!id || query.data)) {
      // Persistent edit session is intentionally independent of the volatile auth/query cache.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpened({ initial: query.data ?? null })
    }
  }, [opened, is_superadmin, id, query.data])
  return { query, opened, is_superadmin }
}
