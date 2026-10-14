export type ConversationPair = { user_low_id: string; user_high_id: string }

/** Меньший идентификатор пары становится `user_low_id`. Сравнение строк совпадает с порядком uuid в PostgreSQL. */
export function pairOf(left: string, right: string): ConversationPair {
  return left < right ? { user_low_id: left, user_high_id: right } : { user_low_id: right, user_high_id: left }
}
