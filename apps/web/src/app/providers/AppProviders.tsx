import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useSettings } from '@/entities/settings'
import { LoginDialog, useSessionExpiredListener } from '@/features/login'
import { createQueryClient } from '@/shared/api'
import { I18nProvider } from '@/shared/i18n'
import { ToastProvider } from '@/shared/ui'
import { ThemeProvider } from './ThemeProvider.tsx'

/** Язык интерфейса — из настроек площадки; пока они грузятся, русский. */
function LocaleProvider({ children }: { children: ReactNode }) {
  const { data } = useSettings()
  return <I18nProvider locale={data?.locale ?? 'ru'}>{children}</I18nProvider>
}

function SessionExpiredListener() {
  useSessionExpiredListener()
  return null
}

/** HeroUI v3 не требует провайдера: вид задают токены и `data-theme` на `<html>`. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [query_client] = useState(createQueryClient)
  return (
    <QueryClientProvider client={query_client}>
      <ThemeProvider>
        <LocaleProvider>
          <ToastProvider>
            {children}
            <LoginDialog />
            <SessionExpiredListener />
          </ToastProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
