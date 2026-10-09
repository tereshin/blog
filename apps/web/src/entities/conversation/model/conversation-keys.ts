export const conversationKeys = {
  all: ['conversations'] as const,
  list: () => [...conversationKeys.all, 'list'] as const,
  messages: (id: string) => [...conversationKeys.all, 'messages', id] as const,
  unread: () => [...conversationKeys.all, 'unread'] as const,
}
