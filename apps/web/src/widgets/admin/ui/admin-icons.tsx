import type { ReactNode } from 'react'
import type { AdminIcon } from '@/entities/admin'
import { BaseIcon } from '@/shared/ui'

export const ADMIN_ICONS = {
  moderation: <BaseIcon name="shield" style="line" size={24} />,
  settings: <BaseIcon name="settings_1" style="line" size={24} />,
  members: <BaseIcon name="group" style="line" size={24} />,
  topics: <BaseIcon name="tag" style="line" size={24} />,
  general: <BaseIcon name="information" style="line" size={24} />,
  access: <BaseIcon name="user_add" style="line" size={24} />,
  reactions: <BaseIcon name="emoji" style="line" size={24} />,
  status: <BaseIcon name="user_star" style="line" size={24} />,
  seo: <BaseIcon name="search_2" style="line" size={24} />,
  publisher: <BaseIcon name="document" style="line" size={24} />,
  covers: <BaseIcon name="pic" style="line" size={24} />,
  articles: <BaseIcon name="document" style="line" size={24} />,
  comments: <BaseIcon name="comment" style="line" size={24} />,
  hidden: <BaseIcon name="eye_close" style="line" size={24} />,
  find: <BaseIcon name="search_2" style="line" size={24} />,
} satisfies Record<AdminIcon, ReactNode>
