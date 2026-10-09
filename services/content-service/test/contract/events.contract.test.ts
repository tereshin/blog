import { readFileSync } from 'node:fs'
import { ArticlePublishedV1, SettingsUpdatedV1 } from '@blog/contracts'
import { describe, expect, it } from 'vitest'
import { settingsUpdatedEvent } from '../../src/modules/settings/settings.events.ts'

const fixture = new URL('../../../../packages/contracts/test/fixtures/content/article-published.json', import.meta.url)

describe('content: контракт событий', () => {
  it('производитель сериализует обновление настроек', () => {
    const event = settingsUpdatedEvent({
      name: 'Блог',
      logo_url: null,
      locale: 'ru',
      registration_open: false,
      new_members_can_publish: true,
      correlation_id: 'c-1',
    })
    expect(SettingsUpdatedV1.parse(event).site_name).toBe('Блог')
  })

  it('потребитель разбирает фикстуру опубликованной статьи', () => {
    const raw: unknown = JSON.parse(readFileSync(fixture, 'utf8'))
    expect(ArticlePublishedV1.parse(raw).name).toBe('content.article.published')
  })
})
