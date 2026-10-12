import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { http } from '@/shared/api'
import type { Session } from '../api/get-session.ts'
import { readStoredAppearance, storeAppearance } from './appearance-storage.ts'
import type { AppearancePreference, Theme } from './appearance-storage.ts'
import { sessionKeys } from './session-keys.ts'
import { useViewer } from './useViewer.ts'

const appearanceSchema = z.object({ appearance: z.enum(['light', 'dark']).nullable() })

const DARK_QUERY = '(prefers-color-scheme: dark)'

let guest_preference: AppearancePreference = readStoredAppearance()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readGuestPreference(): AppearancePreference {
  return guest_preference
}

function writeGuestPreference(preference: AppearancePreference): void {
  guest_preference = preference
  storeAppearance(preference)
  for (const listener of listeners) listener()
}

function darkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
}

function subscribeSystem(listener: () => void): () => void {
  const query = darkQuery()
  query?.addEventListener('change', listener)
  return () => query?.removeEventListener('change', listener)
}

function readSystemTheme(): Theme {
  const query = darkQuery()
  if (!query) return 'dark'
  return query.matches ? 'dark' : 'light'
}

function resolveTheme(preference: AppearancePreference): Theme {
  return preference === 'system' ? readSystemTheme() : preference
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

function memberPreference(session: Session | undefined): AppearancePreference | null {
  if (session?.status !== 'member') return null
  return session.user.appearance ?? 'system'
}

function withAppearance(current: Session | undefined, preference: AppearancePreference): Session | undefined {
  if (!current || current.status !== 'member') return current
  return { ...current, user: { ...current.user, appearance: preference === 'system' ? null : preference } }
}

/**
 * Участник берёт вид из сессии, гость — с устройства. Смена у участника уходит на сервер.
 * `theme` — применённый вид, `preference` — выбор, где `system` следует устройству.
 */
export function useAppearance(): {
  theme: Theme
  preference: AppearancePreference
  setAppearance: (preference: AppearancePreference) => void
} {
  const { viewer } = useViewer()
  const queryClient = useQueryClient()
  const guest = useSyncExternalStore(subscribe, readGuestPreference, () => 'system' as AppearancePreference)
  const system_theme = useSyncExternalStore(subscribeSystem, readSystemTheme, () => 'dark' as Theme)
  const preference: AppearancePreference = viewer.status === 'member' ? (viewer.user.appearance ?? 'system') : guest
  const theme: Theme = preference === 'system' ? system_theme : preference

  const mutation = useMutation({
    mutationFn: (next: AppearancePreference) =>
      http.patch('/v1/users/me/appearance', appearanceSchema, { body: { appearance: next === 'system' ? null : next } }),
    onMutate: (next: AppearancePreference) => {
      const previous = queryClient.getQueryData<Session>(sessionKeys.current())
      queryClient.setQueryData(sessionKeys.current(), withAppearance(previous, next))
      applyTheme(resolveTheme(next))
      return { previous }
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(sessionKeys.current(), context?.previous)
      applyTheme(resolveTheme(memberPreference(context?.previous) ?? readGuestPreference()))
    },
  })

  const setAppearance = (next: AppearancePreference) => {
    if (viewer.status === 'member') {
      mutation.mutate(next)
      return
    }
    applyTheme(resolveTheme(next))
    writeGuestPreference(next)
  }

  return { theme, preference, setAppearance }
}
