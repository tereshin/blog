const MIN_PASSWORD = 8

/** Адрес похож на почту: один `@`, части по сторонам не пустые, без пробелов. */
export function looksLikeEmail(value: string): boolean {
  const email = value.trim()
  const at = email.indexOf('@')
  if (at <= 0 || at !== email.lastIndexOf('@') || at === email.length - 1) return false
  if (email.includes(' ') || email.includes('\t')) return false
  return true
}

/** Отказ у поля до запроса: короткий пароль или адрес не похож на почту. */
export function credentialFieldError(email: string, password: string): 'email' | 'password' | null {
  if (!looksLikeEmail(email)) return 'email'
  if (password.length < MIN_PASSWORD) return 'password'
  return null
}
