import { actionHandlers } from './actions.ts'
import { articleHandlers } from './articles.ts'
import { feedHandlers } from './feed.ts'
import { messageHandlers } from './messages.ts'
import { moderationHandlers } from './moderation.ts'
import { notificationHandlers } from './notifications.ts'
import { profileHandlers } from './profile.ts'
import { searchHandlers } from './search.ts'
import { sessionHandlers } from './session.ts'
import { shellHandlers } from './shell.ts'

// Обработчики разделов (лента, статья, профиль, обсуждение, сообщения, поиск, модерация)
// добавляются вместе со своими историями и подключаются здесь: Storybook и Playwright берут тот же список.
export const handlers = [...sessionHandlers, ...shellHandlers, ...feedHandlers, ...articleHandlers, ...actionHandlers, ...profileHandlers, ...searchHandlers, ...notificationHandlers, ...messageHandlers, ...moderationHandlers]
