import { describe, expect, it } from 'vitest'
import type { ReactionKind, ServiceContext } from '@blog/contracts'
import { applyOne } from '../../src/modules/reaction/reaction.rules.ts'
import { createReactionService } from '../../src/modules/reaction/index.ts'
import type { ReactionRepository, ReactionTarget } from '../../src/modules/reaction/reaction.types.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const READER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ARTICLE = '7a1c2d30-1111-4a11-8a11-000000000001'

const member: ServiceContext = { user_id: READER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${READER}` }

const target: ReactionTarget = {
  target_type: 'article',
  target_id: ARTICLE,
  article_id: ARTICLE,
  author_id: AUTHOR,
  access: { author_id: AUTHOR, visibility: 'public', status: 'published' },
  comment_status: null,
}

describe('одна реакция на объект', () => {
  it('ставит, снимает повтор того же вида и заменяет другим', () => {
    expect(applyOne(null, 'laugh')).toEqual({ next: 'laugh', placed: true })
    expect(applyOne('laugh', 'laugh')).toEqual({ next: null, placed: false })
    expect(applyOne('laugh', 'heart')).toEqual({ next: 'heart', placed: true })
  })

  it('у двоих участников два вида живут независимо, повтор одного оставляет одну', () => {
    const by_user = new Map<string, ReactionKind>()
    const step = (user: string, kind: ReactionKind) => {
      const decision = applyOne(by_user.get(user) ?? null, kind)
      if (decision.next) by_user.set(user, decision.next)
      else by_user.delete(user)
      return by_user.size
    }
    expect(step('a', 'laugh')).toBe(1)
    expect(step('b', 'laugh')).toBe(2)
    expect(step('a', 'laugh')).toBe(1)
    expect(by_user.get('b')).toBe('laugh')
    expect(step('b', 'fire')).toBe(1)
    expect(by_user.get('b')).toBe('fire')
  })
})

describe('react: доступ', () => {
  const repository: ReactionRepository = {
    findTarget: async () => target,
    commit: async () => ({ reaction_counts: { laugh: 1, heart: 0, thumb: 0, fire: 0 }, reaction_count: 1, my_reaction: 'laugh' }),
  }
  const service = createReactionService(repository)
  const body = { target_type: 'article' as const, target_id: ARTICLE, kind: 'laugh' as const }

  it('гость получает 401 и запись не начинается', async () => {
    const calls = { n: 0 }
    const guarded = createReactionService({ ...repository, commit: async (input) => { calls.n += 1; return repository.commit(input) } })
    await expect(guarded.react({ viewer: { ...member, user_id: undefined, role: 'guest' }, body, idempotency_key: null, correlation_id: 'c' })).rejects.toMatchObject({ http_status: 401 })
    expect(calls.n).toBe(0)
  })

  it('ограниченный участник получает 403', async () => {
    await expect(service.react({ viewer: { ...member, is_restricted: true }, body, idempotency_key: null, correlation_id: 'c' })).rejects.toMatchObject({ code: 'restricted' })
  })

  it('недоступная статья — 404', async () => {
    const hidden = createReactionService({
      findTarget: async () => ({ ...target, access: { ...target.access, visibility: 'author' } }),
      commit: repository.commit,
    })
    await expect(hidden.react({ viewer: member, body, idempotency_key: null, correlation_id: 'c' })).rejects.toMatchObject({ http_status: 404, details: { reason: 'unavailable' } })
  })

  it('участник доходит до записи', async () => {
    const response = await service.react({ viewer: member, body, idempotency_key: 'k', correlation_id: 'c' })
    expect(response.my_reaction).toBe('laugh')
  })
})
