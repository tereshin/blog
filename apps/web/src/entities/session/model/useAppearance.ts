import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { http } from '@/shared/api'
import type { Session } from '../api/get-session.ts'
import { readStoredTheme, storeTheme } from './appearance-storage.ts'
import type { Theme } from './appearance-storage.ts'
import { sessionKeys } from './session-keys.ts'
import { useViewer } from './useViewer.ts'

const appearanceSchema = z.object({ appearance: z.enum(['light', 'dark']) })

let guest_theme: Theme = readStoredTheme()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readGuestTheme(): Theme {
  return guest_theme
}

function writeGuestTheme(theme: Theme): void {
  guest_theme = theme
  storeTheme(theme)
  for (const listener of listeners) listener()
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

function withAppearance(current: Session | undefined, appearance: Theme): Session | undefined {
  if (!current || current.status !== 'member') return current
  return { ...current, user: { ...current.user, appearance } }
}

/** Участник берёт вид из сессии, гость — с устройства. Смена у участника уходит на сервер. */
export function useAppearance(): { theme: Theme; setAppearance: (theme: Theme) => void } {
  const { viewer } = useViewer()
  const queryClient = useQueryClient()
  const guest = useSyncExternalStore(subscribe, readGuestTheme, () => 'dark' as Theme)
  const theme: Theme = viewer.status === 'member' ? (viewer.user.appearance ?? 'dark') : guest

  const mutation = useMutation({
    mutationFn: (appearance: Theme) => http.patch('/v1/users/me/appearance', appearanceSchema, { body: { appearance } }),
    onMutate: (appearance: Theme) => {
      const previous = queryClient.getQueryData<Session>(sessionKeys.current())
      queryClient.setQueryData(sessionKeys.current(), withAppearance(previous, appearance))
      applyTheme(appearance)
      return { previous }
    },
    onError: (_error, _appearance, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      const restored = context?.previous?.status === 'member' ? (context.previous.user.appearance ?? 'dark') : readGuestTheme()
      applyTheme(restored)
    },
  })

  const setAppearance = (next: Theme) => {
    if (viewer.status === 'member') {
      mutation.mutate(next)
      return
    }
    applyTheme(next)
    writeGuestTheme(next)
  }

  return { theme, setAppearance }
}
