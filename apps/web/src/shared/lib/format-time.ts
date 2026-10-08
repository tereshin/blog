function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Время публикации на карточке (FR-061): сегодняшнее — `HH:mm`, более старое — `дд.мм.гггг`.
 * Часовой пояс — зрителя; `now` передаётся явно, чтобы функция была чистой.
 */
export function formatTime(value: Date | string, now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  if (isSameDay(date, now)) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
}
