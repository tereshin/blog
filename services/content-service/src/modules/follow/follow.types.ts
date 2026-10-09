import type { FollowState, FollowStates, FollowTargetType, ServiceContext } from '@blog/contracts'
import type { FollowQuery } from './follow.schema.ts'

export type FollowRepository = {
  userExists: (user_id: string) => Promise<boolean>
  topicExists: (topic_id: string) => Promise<boolean>
  follow: (follower_id: string, target_type: FollowTargetType, target_id: string) => Promise<void>
  unfollow: (follower_id: string, target_type: FollowTargetType, target_id: string) => Promise<void>
  isFollowing: (follower_id: string, target_type: FollowTargetType, target_id: string) => Promise<boolean>
  list: (follower_id: string, filter: { target_type?: FollowTargetType; target_ids?: readonly string[] }) => Promise<Array<{ target_type: FollowTargetType; target_id: string }>>
}

export type FollowService = {
  follow: (viewer: ServiceContext, input: { target_type: FollowTargetType; target_id: string }) => Promise<FollowState>
  unfollow: (viewer: ServiceContext, input: { target_type: FollowTargetType; target_id: string }) => Promise<FollowState>
  list: (viewer: ServiceContext, query: FollowQuery) => Promise<FollowStates>
  isFollowingTopic: (viewer: ServiceContext, topic_id: string) => Promise<boolean>
}
