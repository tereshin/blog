import { z } from 'zod'

export const topicDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  slug: z.string(),
  status: z.enum(['active', 'archived']),
  position: z.number().int(),
  is_following: z.boolean().optional(),
})

export const topicListDtoSchema = z.array(topicDtoSchema)

type TopicDto = z.infer<typeof topicDtoSchema>

export type Topic = {
  id: string
  title: string
  description: string
  avatar_url: string | null
  cover_url: string | null
  slug: string
  status: 'active' | 'archived'
  position: number
  is_following: boolean
}

export function toTopic(dto: TopicDto): Topic {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? '',
    avatar_url: dto.avatar_url ?? null,
    cover_url: dto.cover_url ?? null,
    slug: dto.slug,
    status: dto.status,
    position: dto.position,
    is_following: dto.is_following ?? false,
  }
}
