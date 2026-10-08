import { lookupMessage } from './messages.ts'
import type { Locale, MessageKey, MessageValue } from './messages.ts'

export type TranslateParams = Record<string, string | number>
export type Translate = (key: MessageKey, params?: TranslateParams) => string

function fillPlaceholders(template: string, params: TranslateParams | undefined): string {
  if (!params) return template
  return template.replaceAll(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

function pickForm(value: MessageValue, locale: Locale, count: number | undefined): string {
  if (typeof value === 'string') return value
  // Плюрализация по правилам языка: `ru` (one/few/many), `en`, `sr` (one/few/other).
  const category = new Intl.PluralRules(locale).select(count ?? 0)
  const form = category === 'zero' || category === 'two' ? 'other' : category
  return value[form] || value.other
}

/**
 * Чистая функция перевода: подстановка `{name}` и выбор формы множественного числа по `count`.
 * Плейсхолдер `{value}` по умолчанию равен `count`; передайте `value`, когда число показывается сжатым («1,5К»),
 * а форма слова выбирается по настоящему `count`.
 */
export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const count = typeof params?.['count'] === 'number' ? params['count'] : undefined
  const filled = count !== undefined && params?.['value'] === undefined ? { ...params, value: count } : params
  return fillPlaceholders(pickForm(lookupMessage(locale, key), locale, count), filled)
}
