/** Число 0–359 из идентификатора: одна и та же тема всегда получает один и тот же оттенок. */
export function topicHue(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  return hash % 360
}
