import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../src/anchor.ts'
import { DEFAULT_SEED_OPTIONS } from '../src/options.ts'
import { PARTICIPANT_KEYS, buildParticipants } from '../src/participants.ts'
import { buildProfiles } from '../src/profiles.ts'
import { buildSettings } from '../src/settings.ts'
import { buildSlugs } from '../src/slugs.ts'
import { buildTopics } from '../src/topics.ts'

const anchor = new Date('2026-10-08T00:00:00Z')
const users = buildParticipants(anchor, DEFAULT_SEED_OPTIONS)

describe('seed-data: участники', () => {
  it('восемь участников с ключами из contracts/seed.md', () => {
    expect(PARTICIPANT_KEYS).toEqual(['superadmin', 'admin', 'author_a', 'author_b', 'reader', 'no_publish', 'restricted', 'newcomer'])
    expect(users.map((user) => user.key)).toEqual(PARTICIPANT_KEYS)
  })

  it('id, sub, почта и публичный номер уникальны', () => {
    for (const field of ['id', 'sub', 'email', 'public_number'] as const) {
      expect(new Set(users.map((user) => user[field])).size).toBe(users.length)
    }
    expect(users.map((user) => user.public_number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('почта суперадминистратора берётся из окружения', () => {
    const custom = buildParticipants(anchor, { ...DEFAULT_SEED_OPTIONS, superadmin_email: 'root@example.test' })
    expect(custom.find((user) => user.key === 'superadmin')?.email).toBe('root@example.test')
    expect(custom.filter((user) => user.email === 'root@example.test')).toHaveLength(1)
  })

  it('роли и состояния соответствуют назначению', () => {
    const by = Object.fromEntries(users.map((user) => [user.key, user]))
    expect(by.superadmin?.role).toBe('superadmin')
    expect(by.admin?.role).toBe('admin')
    expect(by.author_a?.can_publish).toBe(true)
    expect(by.no_publish?.can_publish).toBe(false)
    expect(by.restricted?.restricted_at).not.toBeNull()
    expect(users.filter((user) => user.restricted_at !== null)).toHaveLength(1)
    expect(users.filter((user) => user.role === 'member').length).toBeGreaterThan(1)
  })

  it('author_a появился больше года назад, newcomer — только что', () => {
    const by = Object.fromEntries(users.map((user) => [user.key, user]))
    expect(anchor.getTime() - (by.author_a?.created_at.getTime() ?? 0)).toBeGreaterThan(365 * DAY_MS)
    expect(anchor.getTime() - (by.newcomer?.created_at.getTime() ?? 0)).toBeLessThanOrEqual(2 * DAY_MS)
  })

  it('время считается от якоря, а не от момента запуска', () => {
    const shifted = buildParticipants(new Date('2027-01-01T00:00:00Z'), DEFAULT_SEED_OPTIONS)
    expect(shifted[2]?.created_at.getTime() ?? 0).toBeGreaterThan(users[2]?.created_at.getTime() ?? 0)
    expect((shifted[2]?.created_at.getTime() ?? 0) - new Date('2027-01-01T00:00:00Z').getTime()).toBe(
      (users[2]?.created_at.getTime() ?? 0) - anchor.getTime(),
    )
  })
})

describe('seed-data: темы, профили, адреса, настройки', () => {
  const topics = buildTopics(DEFAULT_SEED_OPTIONS)
  const profiles = buildProfiles(users, DEFAULT_SEED_OPTIONS)

  it('три активные темы и одна архивная, адреса seed-topic-*', () => {
    expect(topics.filter((topic) => topic.status === 'active')).toHaveLength(3)
    expect(topics.filter((topic) => topic.status === 'archived')).toHaveLength(1)
    expect(topics.every((topic) => topic.slug.startsWith('seed-topic-'))).toBe(true)
  })

  it('профили: с адресом и без, с обложкой и без, с описанием и без', () => {
    expect(profiles.some((profile) => profile.slug !== null)).toBe(true)
    expect(profiles.some((profile) => profile.slug === null)).toBe(true)
    expect(profiles.some((profile) => profile.cover_url !== null)).toBe(true)
    expect(profiles.some((profile) => profile.cover_url === null)).toBe(true)
    expect(profiles.some((profile) => profile.bio !== null)).toBe(true)
    expect(profiles.some((profile) => profile.bio === null)).toBe(true)
    expect(profiles.filter((profile) => profile.slug).every((profile) => profile.slug?.startsWith('seed-'))).toBe(true)
  })

  it('реестр адресов без повторов и со всеми адресами профилей и тем', () => {
    const slugs = buildSlugs(profiles, topics, [])
    expect(new Set(slugs.map((slug) => slug.slug)).size).toBe(slugs.length)
    expect(slugs.filter((slug) => slug.owner_type === 'topic')).toHaveLength(4)
  })

  it('настройки площадки заполнены целиком', () => {
    const settings = buildSettings(DEFAULT_SEED_OPTIONS)
    expect(settings.name).not.toBe('')
    expect(settings.logo_url).not.toBeNull()
    expect(settings.locale).toBe('ru')
    expect(settings.about).not.toBe('')
    expect(settings.registration_open).toBe(true)
    expect(settings.new_members_can_publish).toBe(true)
  })
})
