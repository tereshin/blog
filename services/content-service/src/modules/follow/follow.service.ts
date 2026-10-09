import { z } from 'zod'
import type { FollowTargetType, ServiceContext } from '@blog/contracts'
import { NotFoundError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { SelfFollowError } from './follow.errors.ts'
import type { FollowQuery } from './follow.schema.ts'
import type { FollowRepository, FollowService } from './follow.types.ts'

const MAX_TARGET_IDS = 100
const targetIdsSchema = z.array(z.uuid()).max(MAX_TARGET_IDS)

function requireActor(viewer: ServiceContext): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.is_restricted) throw new RestrictedError()
  return viewer.user_id
}

function parseTargetIds(value: string | undefined): string[] | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const ids = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  const parsed = targetIdsSchema.safeParse(ids)
  if (!parsed.success) throw new ValidationError({ message: 'Некорректный список целей', details: { field: 'target_ids' } })
  return parsed.data
}

export function createFollowService(repository: FollowRepository): FollowService {
  return {
    async follow(viewer, input) {
      const follower_id = requireActor(viewer)
      await assertTarget(repository, follower_id, input.target_type, input.target_id)
      await repository.follow(follower_id, input.target_type, input.target_id)
      return { ...input, is_following: true }
    },
    async unfollow(viewer, input) {
      const follower_id = requireActor(viewer)
      if (input.target_type === 'user' && input.target_id === follower_id) throw new SelfFollowError()
      await repository.unfollow(follower_id, input.target_type, input.target_id)
      return { ...input, is_following: false }
    },
    async list(viewer, query) {
      if (viewer.user_id === undefined) throw new UnauthorizedError()
      const target_ids = parseTargetIds(query.target_ids)
      const rows = await repository.list(viewer.user_id, { target_type: query.target_type, target_ids })
      if (target_ids && query.target_type) {
        const followed = new Set(rows.map((row) => row.target_id))
        return { items: target_ids.map((target_id) => ({ target_type: query.target_type as FollowTargetType, target_id, is_following: followed.has(target_id) })) }
      }
      return { items: rows.map((row) => ({ ...row, is_following: true as const })) }
    },
    isFollowingTopic(viewer, topic_id) {
      if (viewer.user_id === undefined) return Promise.resolve(false)
      return repository.isFollowing(viewer.user_id, 'topic', topic_id)
    },
  }
}

async function assertTarget(repository: FollowRepository, follower_id: string, target_type: FollowTargetType, target_id: string): Promise<void> {
  if (target_type === 'user') {
    if (target_id === follower_id) throw new SelfFollowError()
    if (!(await repository.userExists(target_id))) throw new NotFoundError({ message: 'Такого участника нет' })
    return
  }
  if (!(await repository.topicExists(target_id))) throw new NotFoundError({ message: 'Такой темы нет' })
}

export type { FollowQuery }
