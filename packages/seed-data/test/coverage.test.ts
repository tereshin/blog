import { describe, expect, it } from 'vitest'
import { COVERAGE_RULES, buildDataset } from '../src/index.ts'

const anchor = new Date('2026-10-08T00:00:00Z')

describe('seed-data: покрытие малого набора (data-model.md)', () => {
  const small = buildDataset('small', anchor)

  it('правила покрытия уникальны и охватывают все сущности таблицы', () => {
    const names = COVERAGE_RULES.map((rule) => `${rule.entity}: ${rule.value}`)
    expect(new Set(names).size).toBe(names.length)
    const entities = new Set(COVERAGE_RULES.map((rule) => rule.entity))
    for (const entity of [
      'Участник', 'Профиль', 'Тема', 'Статья', 'Комментарий', 'Реакция', 'Просмотр', 'Просмотренное в ленте', 'Подписка',
      'Закладка', 'Продвижение', 'Репутация и знаки', 'Жалоба', 'Уведомление', 'Диалог и сообщение', 'Настройки площадки',
    ]) {
      expect(entities.has(entity), entity).toBe(true)
    }
  })

  it.each(COVERAGE_RULES.map((rule) => [`${rule.entity}: ${rule.value}`, rule] as const))('%s', (_name, rule) => {
    expect(rule.find(small)).toBeTruthy()
  })

  it('«Показать полностью»: длинная статья заметно длиннее фрагмента карточки', () => {
    const long = small.articles.find((article) => article.key === 'published_long_with_image')
    expect(long?.search_text.length).toBeGreaterThan(long?.excerpt.length ?? 0)
  })

  it('«скрытые, удалённые, черновики» не дают репутации автору', () => {
    const hidden = small.articles.find((article) => article.key === 'hidden_by_moderator')
    const reactions_on_hidden = small.reactions.filter((reaction) => reaction.target_id === hidden?.id).length
    expect(reactions_on_hidden).toBeGreaterThan(0)
    const author_b = small.users.find((user) => user.key === 'author_b')
    const published = new Set(small.articles.filter((a) => a.status === 'published' && a.author_id === author_b?.id).map((a) => a.id))
    const visible_comments = new Set(small.comments.filter((c) => c.status === 'visible' && c.author_id === author_b?.id).map((c) => c.id))
    const expected = small.reactions.filter((r) => (r.target_type === 'article' ? published : visible_comments).has(r.target_id)).length
    expect(small.derived.reputation.get(author_b?.id ?? '')).toBe(expected)
  })
})
