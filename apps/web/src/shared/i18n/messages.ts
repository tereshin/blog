import en from './en.json'
import ru from './ru.json'
import sr from './sr.json'

export type Locale = 'ru' | 'en' | 'sr'
export const DEFAULT_LOCALE: Locale = 'ru'

export type MessageKey = keyof typeof ru
export type PluralForms = { one: string; few: string; many: string; other: string }
export type MessageValue = string | PluralForms

/** Каталоги по языкам. Русский остаётся запасным, если в `en` или `sr` нет ключа. */
const catalogs: Record<Locale, Partial<Record<MessageKey, MessageValue>>> = {
  ru: ru as Record<MessageKey, MessageValue>,
  en: en as Record<MessageKey, MessageValue>,
  sr: sr as Record<MessageKey, MessageValue>,
}

export function lookupMessage(locale: Locale, key: MessageKey): MessageValue {
  return catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key
}
