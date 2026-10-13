/** Встроенная секция тем. Её нет в базе: идентификатор нужен только для свёрнутости. */
export const TOPICS_SECTION_ID = 'topics'

/** «Системная тема» живёт в последней своей секции, а без них — в секции тем. */
export function themeHostSectionId(section_ids: readonly string[]): string {
  return section_ids.at(-1) ?? TOPICS_SECTION_ID
}
