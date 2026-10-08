import { DAY_MS, at } from './anchor.ts'
import { userId } from './participants.ts'
import { topicId } from './topics.ts'
import type { SeedFollow } from './types.ts'

/** Подписки на авторов и темы. На себя никто не подписан. */
export function buildFollows(anchor: Date): SeedFollow[] {
  const follow = (follower: string, target_type: 'user' | 'topic', target_id: string, days_ago: number): SeedFollow => ({
    follower_id: userId(follower),
    target_type,
    target_id,
    created_at: at(anchor, -days_ago * DAY_MS),
  })
  return [
    follow('reader', 'user', userId('author_a'), 60),
    follow('reader', 'user', userId('author_b'), 45),
    follow('reader', 'topic', topicId('design'), 40),
    follow('reader', 'topic', topicId('engineering'), 30),
    follow('admin', 'user', userId('author_a'), 90),
    follow('author_b', 'user', userId('author_a'), 50),
    follow('no_publish', 'topic', topicId('product'), 20),
  ]
}
