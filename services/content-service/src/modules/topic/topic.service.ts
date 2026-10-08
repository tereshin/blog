import { NotFoundError } from '@blog/errors'
import type { Topic } from '@blog/contracts'
import type { TopicRepository } from './topic.repository.ts'

export type TopicService = {
  listActive: () => Promise<Topic[]>
  getBySlug: (slug: string) => Promise<Topic>
}

export function createTopicService(repository: TopicRepository): TopicService {
  return {
    listActive: () => repository.listActive(),
    async getBySlug(slug) {
      // Архивная тема тоже открывается: на неё ведут старые ссылки и статьи.
      const topic = await repository.findBySlug(slug)
      if (!topic) throw new NotFoundError({ message: 'Такой темы нет' })
      return topic
    },
  }
}
