import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAppearance } from '@/entities/session'

/**
 * Вид ставится атрибутом `data-theme` и классом на `<html>`. Вошедший берёт вид из учётной записи,
 * гость — с устройства; пока выбора не было, вид тёмный. При входе выбор учётной записи важнее.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useAppearance()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  return children
}
