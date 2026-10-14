import { navSectionHandlers } from './nav-sections.ts'
import { pageHandlers } from './pages.ts'
import { siteAssetHandlers } from './site-assets.ts'
import { commentInteractionHandlers } from './comment-interactions.ts'
import { commentReportHandlers } from './comment-reports.ts'
import { articleReadHandlers } from './article-read.ts'
import { commentHandlers } from './comments.ts'
import { engagementHandlers } from './engagement.ts'
import { followHandlers } from './follows.ts'
import { articleHandlers } from './articles.ts'
import { feedHandlers } from './feed.ts'
import { messageHandlers } from './messages.ts'
import { memberHandlers } from './members.ts'
import { moderationHandlers } from './moderation.ts'
import { notificationHandlers } from './notifications.ts'
import { profileHandlers } from './profile.ts'
import { searchHandlers } from './search.ts'
import { sessionHandlers } from './session.ts'
import { seoHandlers } from './seo.ts'
import { shellHandlers } from './shell.ts'
import { topicHandlers } from './topics.ts'

// Обработчики разделов (лента, статья, профиль, обсуждение, сообщения, поиск, модерация)
// добавляются вместе со своими историями и подключаются здесь: Storybook и Playwright берут тот же список.
export const handlers = [
  ...navSectionHandlers,
  ...pageHandlers,
  ...siteAssetHandlers,
  ...seoHandlers,
  ...sessionHandlers,
  ...shellHandlers,
  ...topicHandlers,
  ...feedHandlers,
  ...articleHandlers,
  ...commentInteractionHandlers,
  ...commentReportHandlers,
  ...articleReadHandlers,
  ...commentHandlers,
  ...engagementHandlers,
  ...followHandlers,
  ...profileHandlers,
  ...searchHandlers,
  ...notificationHandlers,
  ...messageHandlers,
  ...moderationHandlers,
  ...memberHandlers,
]
