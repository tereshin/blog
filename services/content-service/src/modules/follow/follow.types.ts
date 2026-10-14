import type { FollowTargetType } from '@blog/contracts'

/** Порт хранилища подписок: сервис зависит от него, реализацию подставляет app.ts. */
export type FollowRepositoryPort = {
  userExists: (user_id: string) => Promise<boolean>
  topicExists: (topic_id: string) => Promise<boolean>
  follow: (follower_id: string, target_type: FollowTargetType, target_id: string) => Promise<void>
  unfollow: (follower_id: string, target_type: FollowTargetType, target_id: string) => Promise<void>
  isFollowing: (follower_id: string, target_type: FollowTargetType, target_id: string) => Promise<boolean>
  list: (follower_id: string, filter: { target_type?: FollowTargetType; target_ids?: readonly string[] }) => Promise<Array<{ target_type: FollowTargetType; target_id: string }>>
}
