import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ArticleDraft, BlocksDocument } from '@blog/contracts'
import { BlockRenderer } from '@/entities/article'
import type { Topic } from '@/entities/topic'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import {
  Avatar,
  Button,
  BaseIcon,
  CloseButton,
  CommentIcon,
  Menu,
  useToast,
} from '@/shared/ui'
import type { ArticleDraftForm } from '../model/usePublishArticle.ts'

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
  show_saved: boolean
  onToggleFullscreen: () => void
  is_fullscreen: boolean
  onClose: () => void
  onDirty: (is_dirty: boolean) => void
  onSubmit: (mode: 'draft' | 'publish', form: ArticleDraftForm) => Promise<ArticleDraft | null>
}

import { TopicPicker } from './TopicPicker.tsx'
import { PublishSettings } from './PublishSettings.tsx'

const REASON_KEY = {
  title: 'editor.error.title',
  topic: 'editor.error.topic',
  content: 'editor.error.content',
} as const

function formFrom(initial: ArticleDraft | null, topic_id: string): ArticleDraftForm {
  if (!initial)
    return { title: '', topic_id, visibility: 'public', comments_enabled: true, slug: '', seo_title: '', seo_description: '' }
  return {
    title: initial.title,
    seo_title: initial.seo_title ?? '',
    seo_description: initial.seo_description ?? '',
    topic_id: initial.topic_id,
    visibility: initial.visibility,
    comments_enabled: initial.comments_enabled,
    slug: '',
  }
}

function sameForm(left: ArticleDraftForm, right: ArticleDraftForm): boolean {
  return (
    left.title === right.title &&
    left.topic_id === right.topic_id &&
    left.visibility === right.visibility &&
    left.comments_enabled === right.comments_enabled &&
    left.slug === right.slug &&
    (left.seo_title ?? '') === (right.seo_title ?? '') &&
    (left.seo_description ?? '') === (right.seo_description ?? '')
  )
}

/** Поля статьи внутри окна: автор и тема сверху, заголовок, подвал с публикацией. */
export function PublishPanel({
  initial,
  topics,
  editor_ready,
  readDocument,
  is_pending,
  slug_error,
  reasons,
  children,
  show_saved,
  onClose,
  onToggleFullscreen,
  is_fullscreen,
  onDirty,
  onSubmit,
}: PublishPanelProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const toast = useToast()
  const [preview, setPreview] = useState<BlocksDocument | null>(null)
  const handlePreview = async () => {
    if (preview) {
      setPreview(null)
      return
    }
    try {
      setPreview(await readDocument())
    } catch {
      toast.error(t('editor.error.invalid_document'))
    }
  }
  const active = topics.filter((topic) => topic.status === 'active')
  const [baseline, setBaseline] = useState(() => formFrom(initial, active[0]?.id ?? ''))
  const [form, setForm] = useState(baseline)
  const author_name = viewer.status === 'member' ? viewer.profile.display_name : ''
  const avatar_url = viewer.status === 'member' ? viewer.profile.avatar_url : null

  useEffect(() => {
    onDirty(!sameForm(form, baseline))
  }, [form, baseline, onDirty])

  const update = (patch: Partial<ArticleDraftForm>) =>
    setForm((current) => ({ ...current, ...patch }))
  const can_submit =
    editor_ready &&
    !is_pending &&
    form.title.trim().length > 0 &&
    form.title.length <= 150 &&
    form.topic_id.length > 0

  const submit = (mode: 'draft' | 'publish') => {
    void onSubmit(mode, form).then((saved) => {
      if (saved) setBaseline(form)
    })
  }

  return (
    <div className="article-editor-panel flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 pl-16 pr-5 pt-7 sm:pl-24 sm:pr-8">
        <Avatar src={avatar_url} name={author_name || t('header.write')} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{author_name}</p>
          <TopicPicker topics={active} value={form.topic_id} onChange={(topic_id) => update({ topic_id })} />
        </div>
        <Button
          variant="ghost"
          isIconOnly
          className="ml-auto rounded-full bg-surface-secondary"
          aria-label={t(is_fullscreen ? 'editor.collapse' : 'editor.expand')}
          onPress={onToggleFullscreen}
        >
          {is_fullscreen ? <BaseIcon name="fullscreen_exit_2" style="line" /> : <BaseIcon name="fullscreen_2" style="line" />}
        </Button>
        <CloseButton aria-label={t('common.close')} className="rounded-full bg-surface-secondary" onPress={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6 sm:px-8">
        <div hidden={Boolean(preview)}>{children(form.title, (title) => update({ title }))}</div>
        {preview ? (
          <div className="pl-11 sm:pl-16">
            <h1 className="article-editor-title">{form.title}</h1>
            <BlockRenderer blocks={preview.blocks} />
          </div>
        ) : null}
        {form.title.length > 120 ? <p className={form.title.length > 150 ? 'text-right text-xs text-danger' : 'text-right text-xs text-muted'} role="status">{t('editor.title_count', { count: form.title.length })}</p> : null}
        {reasons.length > 0 ? (
          <ul className="mt-3 text-sm text-danger">
            {reasons.map((reason) => (
              <li key={reason}>
                {reason in REASON_KEY ? t(REASON_KEY[reason as keyof typeof REASON_KEY]) : reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-separator pl-16 pr-5 py-4 sm:pl-24 sm:pr-8">
        <Button variant="primary" shape="pill" isDisabled={!can_submit} onPress={() => submit('publish')}>
          {t('editor.publish')}
        </Button>
        <Menu>
          <Button variant="ghost" size="sm" aria-label={t('editor.comments_who')} className="gap-1.5 px-0 text-muted">
            <CommentIcon />
            <span className="hidden sm:inline">{t(form.comments_enabled ? 'editor.comments_all' : 'editor.comments_none')}</span>
            <BaseIcon name="down" style="line" size={16} />
          </Button>
          <Menu.Content aria-label={t('editor.comments_who')} selectionMode="single" selectedKeys={[form.comments_enabled ? 'all' : 'none']} onAction={(key) => update({ comments_enabled: key === 'all' })}>
            <Menu.Item id="all">{t('editor.comments_all')}</Menu.Item>
            <Menu.Item id="none">{t('editor.comments_none')}</Menu.Item>
          </Menu.Content>
        </Menu>
        <div className="ml-auto flex items-center gap-2">
          {show_saved ? <span role="status" className="text-xs text-muted">{t('editor.saved')} ✓</span> : null}
          <PublishSettings form={form} slug={initial?.slug ?? ''} slug_error={slug_error} can_submit={can_submit} editor_ready={editor_ready} is_preview={Boolean(preview)} onChange={update} onSave={() => submit('draft')} onPreview={() => { void handlePreview() }} />
        </div>
      </div>
    </div>
  )
}
