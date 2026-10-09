export type Theme = 'dark' | 'light'

const APPEARANCE_KEY = 'appearance'

/** `localStorage` — только вид гостя. У участника выбор лежит в учётной записи. */
export function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(APPEARANCE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(APPEARANCE_KEY, theme)
  } catch {
    // Хранилище недоступно: вид живёт до перезагрузки.
  }
}
