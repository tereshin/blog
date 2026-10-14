import { z } from 'zod'
import type { FollowState, FollowStates, FollowTargetType, ServiceContext } from '@blog/contracts'
import { requireVerifiedEmail } from '../../shared/require-verified-email.ts'
import { EmailUnverifiedError, NotFoundError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { SelfFollowError } from './follow.errors.ts'
import type { FollowQuery } from './follow.schema.ts'
import type { FollowRepositoryPort } from './follow.types.ts'

const MAX_TARGET_IDS = 100
const TargetIdsSchema = z.array(z.uuid()).max(MAX_TARGET_IDS)

type FollowTarget = { target_type: FollowTargetType; target_id: string }

function requireActor(viewer: ServiceContext): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.is_restricted) throw new RestrictedError()
  if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return viewer.user_id
}

function parseTargetIds(value: string | undefined): string[] | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const ids = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  const parsed = TargetIdsSchema.safeParse(ids)
  if (!parsed.success) throw new ValidationError({ message: 'Некорректный список целей', details: { field: 'target_ids' } })
  return parsed.data
}

export class FollowService {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async follow(viewer: ServiceContext, input: FollowTarget): Promise<FollowState> {
    const follower_id = requireActor(viewer)
    await this.assertTarget(follower_id, input)
    await this.repository.follow(follower_id, input.target_type, input.target_id)
    return { ...input, is_following: true }
  }

  async unfollow(viewer: ServiceContext, input: FollowTarget): Promise<FollowState> {
    const follower_id = requireActor(viewer)
    if (input.target_type === 'user' && input.target_id === follower_id) throw new SelfFollowError()
    await this.repository.unfollow(follower_id, input.target_type, input.target_id)
    return { ...input, is_following: false }
  }

  async list(viewer: ServiceContext, query: FollowQuery): Promise<FollowStates> {
    if (viewer.user_id === undefined) throw new UnauthorizedError()
    const target_ids = parseTargetIds(query.target_ids)
    const rows = await this.repository.list(viewer.user_id, { target_type: query.target_type, target_ids })
    const target_type = query.target_type
    if (target_ids && target_type) {
      const followed_ids = new Set(rows.map((row) => row.target_id))
      return { items: target_ids.map((target_id) => ({ target_type, target_id, is_following: followed_ids.has(target_id) })) }
    }
    return { items: rows.map((row) => ({ ...row, is_following: true as const })) }
  }

  isFollowingTopic(viewer: ServiceContext, topic_id: string): Promise<boolean> {
    if (viewer.user_id === undefined) return Promise.resolve(false)
    return this.repository.isFollowing(viewer.user_id, 'topic', topic_id)
  }

  private async assertTarget(follower_id: string, target: FollowTarget): Promise<void> {
    if (target.target_type === 'user') {
      if (target.target_id === follower_id) throw new SelfFollowError()
      if (!(await this.repository.userExists(target.target_id))) throw new NotFoundError({ message: 'Такого участника нет' })
      return
    }
    if (!(await this.repository.topicExists(target.target_id))) throw new NotFoundError({ message: 'Такой темы нет' })
  }
}
