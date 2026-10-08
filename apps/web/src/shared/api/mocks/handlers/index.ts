import { feedHandlers } from './feed.ts'
import { sessionHandlers } from './session.ts'
import { shellHandlers } from './shell.ts'

// Обработчики разделов (лента, статья, профиль, обсуждение, сообщения, поиск, модерация)
// добавляются вместе со своими историями и подключаются здесь: Storybook и Playwright берут тот же список.
export const handlers = [...sessionHandlers, ...shellHandlers, ...feedHandlers]
