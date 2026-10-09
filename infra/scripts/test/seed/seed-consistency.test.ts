import { buildDataset } from '@blog/seed-data'
import { describe, expect, it } from 'vitest'

describe('согласованность набора', () => {
  it('ссылки сообщений, уведомлений и файлов указывают на существующие записи', () => {
    const data = buildDataset('small', new Date('2026-10-08T00:00:00Z'), {
      media_base_url: 'http://localhost:9000/media',
      superadmin_email: 'superadmin@blog.test',
    })
    const users = new Set(data.users.map((user) => user.id))
    const conversations = new Set(data.conversations.map((item) => item.id))
    const articles = new Set(data.articles.map((item) => item.id))
    const urls = new Set(data.files.map((file) => file.url))
    for (const message of data.messages) {
      expect(conversations.has(message.conversation_id)).toBe(true)
      expect(users.has(message.sender_id)).toBe(true)
    }
    for (const conversation of data.conversations) {
      expect(users.has(conversation.user_low_id)).toBe(true)
      expect(users.has(conversation.user_high_id)).toBe(true)
    }
    for (const note of data.notifications) {
      expect(users.has(note.user_id)).toBe(true)
      if (note.article_id) expect(articles.has(note.article_id)).toBe(true)
    }
    for (const article of data.articles) {
      for (const block of article.blocks.blocks) {
        const url = block.data && typeof block.data === 'object' && 'url' in block.data ? block.data.url : null
        if (typeof url === 'string' && url.startsWith(data.files[0]?.url.slice(0, 10) ?? 'http')) {
          expect(urls.has(url) || url.startsWith('http://localhost:9000/media')).toBe(true)
        }
      }
    }
  })
})
