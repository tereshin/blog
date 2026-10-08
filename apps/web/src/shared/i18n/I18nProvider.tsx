import { createContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_LOCALE } from './messages.ts'
import type { Locale } from './messages.ts'
import { translate } from './translate.ts'
import type { Translate } from './translate.ts'

export type I18nValue = { locale: Locale; t: Translate }

export const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
})

type I18nProviderProps = { locale?: Locale; children: ReactNode }

export function I18nProvider({ locale = DEFAULT_LOCALE, children }: I18nProviderProps) {
  const value = useMemo<I18nValue>(() => ({ locale, t: (key, params) => translate(locale, key, params) }), [locale])
  return <I18nContext value={value}>{children}</I18nContext>
}
