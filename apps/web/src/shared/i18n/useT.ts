import { use } from 'react'
import { I18nContext } from './I18nProvider.tsx'
import type { I18nValue } from './I18nProvider.tsx'

export function useT(): I18nValue {
  return use(I18nContext)
}
