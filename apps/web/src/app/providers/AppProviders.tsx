import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import { CommentReactionGlyphsProvider } from '@/entities/comment'
import { useSettings, useSettingsLive } from '@/entities/settings'
import { LoginDialog, useSessionExpiredListener } from '@/features/login'
import { useSessionBroadcast } from '@/features/logout'
import { createQueryClient } from '@/shared/api'
import { I18nProvider } from '@/shared/i18n'
import { ToastProvider } from '@/shared/ui'
import { ThemeProvider } from './ThemeProvider.tsx'

/** Язык интерфейса — из настроек площадки; пока они грузятся, русский. */
function LocaleProvider({ children }: { children: ReactNode }) {
  const { data } = useSettings()
  useSettingsLive()
  return (
    <CommentReactionGlyphsProvider appearances={data?.reaction_appearances ?? DEFAULT_REACTION_APPEARANCES}>
      <I18nProvider locale={data?.locale ?? 'ru'}>{children}</I18nProvider>
    </CommentReactionGlyphsProvider>
  )
}

function SessionExpiredListener() {
  useSessionExpiredListener()
  useSessionBroadcast()
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
