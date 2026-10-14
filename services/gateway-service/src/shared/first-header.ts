/** Первое значение заголовка: Node отдаёт повторённый заголовок массивом. */
export function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
