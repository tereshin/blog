import { describe, expect, it } from 'vitest'
import { toTopic, topicHue } from '@/entities/topic'

describe('маппер темы', () => {
  it('тема заполняет необязательные поля и даёт устойчивый оттенок', () => {
    const topic = toTopic({ id: 't1', title: 'Наука', slug: 'nauka', status: 'active', position: 1 })
    expect(topic).toMatchObject({ description: '', avatar_url: null, cover_url: null })
    expect(topicHue('t1')).toBe(topicHue('t1'))
    expect(topicHue('t1')).toBeGreaterThanOrEqual(0)
    expect(topicHue('t1')).toBeLessThan(360)
  })
})
