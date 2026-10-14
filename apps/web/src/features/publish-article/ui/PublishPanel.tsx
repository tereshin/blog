import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import type { ArticleDraft, BlocksDocument } from '@blog/contracts'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Avatar, Button } from '@/shared/ui'
import type { EditorPanelSlots } from '@/shared/ui'
import { TITLE_COUNTER_FROM, TITLE_MAX } from '../lib/article-form.ts'
import type { ArticleDraftForm } from '../model/usePublishArticle.ts'
import { usePublishPanel } from '../model/usePublishPanel.ts'
import { CommentsMenu } from './CommentsMenu.tsx'
import { PublishSettings } from './PublishSettings.tsx'
import { TopicPicker } from './TopicPicker.tsx'

type PublishPanelProps = {
  initial: ArticleDraft | null
  topics: Topic[]
  readDocument: () => Promise<BlocksDocument>
  editor_ready: boolean
  is_pending: boolean
  slug_error: string | null
  reasons: readonly string[]
  /** Редактор между заголовком и подвалом окна. */
  children: (title: string, onTitleChange: (title: string) => void) => ReactNode
  saved?: ReactNode
  renderPanel: (slots: EditorPanelSlots) => ReactNode
  onDirty: (is_dirty: boolean) => void
  onSubmit: (mode: 'draft' | 'publish', form: ArticleDraftForm) => Promise<ArticleDraft | null>
}

const title_count_class = cva('text-right text-xs', {
  variants: {
    is_over: {
      true: 'text-danger',
      false: 'text-muted',
    },
  },
})

const REASON_KEY = {
  title: 'editor.error.title',
  topic: 'editor.error.topic',
  content: 'editor.error.content',
} as const

/** Поля статьи внутри окна: автор и тема сверху, заголовок, подвал с публикацией. */
export function PublishPanel({ slug_error, reasons, children, saved, renderPanel, ...input }: PublishPanelProps) {
  const { t } = useT()
  const panel = usePublishPanel(input)
  const { form, update } = panel

  return renderPanel({
    header: (
      <>
        <Avatar src={panel.avatar_url} name={panel.author_name || t('header.write')} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{panel.author_name}</p>
          <TopicPicker topics={panel.active_topics} value={form.topic_id} onChange={(topic_id) => update({ topic_id })} />
        </div>
      </>
    ),
    metadata: (
      <>
        {form.title.length > TITLE_COUNTER_FROM ? (
          <p
            className={title_count_class({ is_over: form.title.length > TITLE_MAX })}
            role="status"
          >
            {t('editor.title_count', { count: form.title.length })}
          </p>
        ) : null}
        {reasons.length > 0 ? (
          <ul className="mt-3 text-sm text-danger">
            {reasons.map((reason) => (
              <li key={reason}>
                {reason in REASON_KEY ? t(REASON_KEY[reason as keyof typeof REASON_KEY]) : reason}
              </li>
            ))}
          </ul>
        ) : null}
      </>
    ),
    children: children(form.title, (title) => update({ title })),
    preview: panel.preview ? { title: form.title, blocks: panel.preview.blocks } : null,
    footer: (
      <>
        <Button variant="primary" shape="pill" isDisabled={!panel.can_submit} onPress={panel.handlePublish}>
          {t('editor.publish')}
        </Button>
        <CommentsMenu
          is_enabled={form.comments_enabled}
          onChange={(comments_enabled) => update({ comments_enabled })}
        />
        <div className="ml-auto flex items-center gap-2">
          {saved}
          <PublishSettings
            form={form}
            slug={input.initial?.slug ?? ''}
            slug_error={slug_error}
            can_submit={panel.can_submit}
            editor_ready={input.editor_ready}
            is_preview={Boolean(panel.preview)}
            onChange={update}
            onSave={panel.handleSaveDraft}
            onPreview={panel.handlePreview}
          />
        </div>
      </>
    ),
  })
}
