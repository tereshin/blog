import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsKeys } from '@/entities/settings'
import type { WelcomeContent } from '@blog/contracts'
import { useViewer } from '@/entities/session'
import { getAdminSettings } from '@/features/update-settings'

export function useWelcomeSettings() {
  const { is_superadmin } = useViewer()
  const [opened, setOpened] = useState<{ initial: WelcomeContent | null } | null>(null)
  const query = useQuery({
    enabled: is_superadmin,
    queryKey: settingsKeys.admin(),
    queryFn: ({ signal }) => getAdminSettings(signal),
  })
  return { is_superadmin, opened, setOpened, query }
}
