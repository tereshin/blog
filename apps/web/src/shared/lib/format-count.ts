export type CountLocale = 'ru' | 'en' | 'sr'

const SUFFIX: Record<CountLocale, { thousand: string; million: string }> = {
  ru: { thousand: 'К', million: 'М' },
  en: { thousand: 'K', million: 'M' },
  sr: { thousand: 'K', million: 'M' },
}

/** Отбрасываем лишнее (не округляем вверх): 1999 → «1,9К», а не «2К», чтобы число не выглядело больше, чем есть. */
function compact(value: number, locale: CountLocale, suffix: string): string {
  const floored = Math.floor(value * 10) / 10
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(floored)}${suffix}`
}

/**
 * Число для счётчиков (FR-063): до 1000 — как есть, от 1000 — одна десятая с буквой «К»,
 * от миллиона — с буквой «М»; буква зависит от языка интерфейса.
 */
export function formatCount(count: number, locale: CountLocale = 'ru'): string {
  const value = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0
  const { thousand, million } = SUFFIX[locale]
  if (value >= 1_000_000) return compact(value / 1_000_000, locale, million)
  if (value >= 1000) return compact(value / 1000, locale, thousand)
  return String(value)
}
