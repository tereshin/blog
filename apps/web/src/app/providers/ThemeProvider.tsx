import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useViewer } from '@/entities/session'
import { readStoredTheme, storeTheme } from './theme-storage.ts'
import type { Theme } from './theme-storage.ts'

type ThemeValue = { theme: Theme; setGuestTheme: (theme: Theme) => void }

const ThemeContext = createContext<ThemeValue>({ theme: 'dark', setGuestTheme: () => {} })

export function useTheme(): ThemeValue {
  return use(ThemeContext)
}

/**
 * Вид ставится атрибутом `data-theme` и классом на `<html>`. Вошедший берёт вид из учётной записи,
 * гость — с устройства; пока выбора не было, вид тёмный.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { viewer } = useViewer()
  const [guest_theme, setGuestThemeState] = useState<Theme>(readStoredTheme)
  const theme: Theme = viewer.status === 'member' ? viewer.user.appearance : guest_theme

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  const setGuestTheme = useCallback((next: Theme) => {
    storeTheme(next)
    setGuestThemeState(next)
  }, [])

  const value = useMemo(() => ({ theme, setGuestTheme }), [theme, setGuestTheme])
  return <ThemeContext value={value}>{children}</ThemeContext>
}
