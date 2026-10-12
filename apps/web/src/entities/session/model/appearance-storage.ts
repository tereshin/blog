export type Theme = 'dark' | 'light'
/** Выбор вида; `system` — вид следует настройке устройства. */
export type AppearancePreference = Theme | 'system'

const APPEARANCE_KEY = 'appearance'

/** `localStorage` — только вид гостя. У участника выбор лежит в учётной записи. */
export function readStoredAppearance(): AppearancePreference {
  try {
    const stored = window.localStorage.getItem(APPEARANCE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function storeAppearance(preference: AppearancePreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(APPEARANCE_KEY)
    else window.localStorage.setItem(APPEARANCE_KEY, preference)
  } catch {
    // Хранилище недоступно: вид живёт до перезагрузки.
  }
}
