import session_fixtures from '../fixtures/session.json'

export type MockProfile = { user_id: string; display_name: string; avatar_url: string | null; slug: string | null }

const PROFILES: Record<string, MockProfile> = {
  'a1000000-0000-4000-8000-000000000001': { user_id: 'a1000000-0000-4000-8000-000000000001', display_name: 'Анна Авторова', avatar_url: null, slug: 'anna' },
  '0b3a4c50-3333-4c33-8c33-000000000005': { user_id: '0b3a4c50-3333-4c33-8c33-000000000005', display_name: 'Роман Читаев', avatar_url: null, slug: 'reader' },
  '0b3a4c50-3333-4c33-8c33-000000000002': { user_id: '0b3a4c50-3333-4c33-8c33-000000000002', display_name: 'Адам Модератов', avatar_url: null, slug: 'admin' },
  '0b3a4c50-3333-4c33-8c33-000000000003': { user_id: '0b3a4c50-3333-4c33-8c33-000000000003', display_name: 'Саша Владельцева', avatar_url: null, slug: 'owner' },
  '0b3a4c50-3333-4c33-8c33-000000000006': { user_id: '0b3a4c50-3333-4c33-8c33-000000000006', display_name: 'Тихий Зритель', avatar_url: null, slug: 'silent' },
  '0b3a4c50-3333-4c33-8c33-000000000007': { user_id: '0b3a4c50-3333-4c33-8c33-000000000007', display_name: 'Рита Ограничева', avatar_url: null, slug: 'rita' },
}

const RESTRICTED_ID = '0b3a4c50-3333-4c33-8c33-000000000007'

type StoredMessage = {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
  read_at: string | null
}

const messages: StoredMessage[] = []
const conversation_by_pair = new Map<string, string>()

function pairKey(left: string, right: string): string {
  return left < right ? `${left}:${right}` : `${right}:${left}`
}

export function profileOf(user_id: string): MockProfile {
  return PROFILES[user_id] ?? { user_id, display_name: '', avatar_url: null, slug: null }
}

export function isRestricted(user_id: string): boolean {
  return user_id === RESTRICTED_ID
}

export function viewerIdOf(viewer: keyof typeof session_fixtures): string | null {
  const session = session_fixtures[viewer]
  return 'user' in session ? session.user.id : null
}

export function conversationIdFor(left: string, right: string): string {
  const key = pairKey(left, right)
  const existing = conversation_by_pair.get(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  conversation_by_pair.set(key, id)
  return id
}

export function addMockMessage(input: { sender_id: string; recipient_id: string; body: string }): StoredMessage {
  const conversation_id = conversationIdFor(input.sender_id, input.recipient_id)
  const message: StoredMessage = {
    id: crypto.randomUUID(),
    conversation_id,
    sender_id: input.sender_id,
    recipient_id: input.recipient_id,
    body: input.body,
    created_at: new Date().toISOString(),
    read_at: null,
  }
  messages.push(message)
  return message
}

export function messagesForConversation(conversation_id: string, user_id: string): StoredMessage[] | null {
  const rows = messages.filter((item) => item.conversation_id === conversation_id)
  if (rows.length === 0) return null
  if (!rows.some((item) => item.sender_id === user_id || item.recipient_id === user_id)) return null
  return [...rows].sort((left, right) => (left.created_at < right.created_at ? 1 : -1))
}

export function conversationsFor(user_id: string) {
  const ids = new Set(messages.filter((item) => item.sender_id === user_id || item.recipient_id === user_id).map((item) => item.conversation_id))
  return [...ids]
    .map((id) => {
      const rows = messages.filter((item) => item.conversation_id === id).sort((left, right) => (left.created_at < right.created_at ? 1 : -1))
      const latest = rows[0]
      if (!latest) return null
      const peer_id = latest.sender_id === user_id ? latest.recipient_id : latest.sender_id
      const unread_count = rows.filter((item) => item.recipient_id === user_id && item.read_at === null).length
      return {
        id,
        peer: profileOf(peer_id),
        last_message_at: latest.created_at,
        last_message_excerpt: latest.body.slice(0, 140),
        unread_count,
      }
    })
    .filter((item) => item !== null)
    .sort((left, right) => (left.last_message_at < right.last_message_at ? 1 : -1))
}

export function unreadCountFor(user_id: string): number {
  return messages.filter((item) => item.recipient_id === user_id && item.read_at === null).length
}

export function markMockConversationRead(conversation_id: string, user_id: string): boolean {
  const rows = messages.filter((item) => item.conversation_id === conversation_id)
  if (!rows.some((item) => item.sender_id === user_id || item.recipient_id === user_id)) return false
  const now = new Date().toISOString()
  for (const item of rows) {
    if (item.recipient_id === user_id && item.read_at === null) item.read_at = now
  }
  return true
}
