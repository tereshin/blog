export type MockNotification = {
  id: string
  user_id: string
  kind: 'comment' | 'reply' | 'reaction' | 'message' | 'moderation' | 'mention'
  article_id: string | null
  article_slug: string | null
  article_title: string | null
  comment_id: string | null
  conversation_id: string | null
  actor: { display_name: string; avatar_url: string | null }
  read_at: string | null
  created_at: string
}

const items: MockNotification[] = []

export function addMockNotification(item: MockNotification): void {
  items.unshift(item)
}

export function notificationsFor(user_id: string): MockNotification[] {
  return items.filter((item) => item.user_id === user_id)
}

export function markMockNotificationRead(user_id: string, id: string): MockNotification | null {
  const item = items.find((entry) => entry.user_id === user_id && entry.id === id)
  if (!item) return null
  item.read_at ??= new Date().toISOString()
  return item
}

export function markAllMockNotificationsRead(user_id: string): void {
  const now = new Date().toISOString()
  for (const item of items) {
    if (item.user_id === user_id && item.read_at === null) item.read_at = now
  }
}
