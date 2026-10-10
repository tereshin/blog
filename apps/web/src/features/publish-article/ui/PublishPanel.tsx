import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ArticleDraft } from '@blog/contracts'
import type { Topic } from '@/entities/topic'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Avatar, Button, ChevronDownIcon, Menu, MoreIcon, Popover } from '@/shared/ui'
import type { ArticleDraftForm } from '../model/usePublishArticle.ts'

type PublishPanelProps = {
  initial: ArticleDraft | null
  topics: Topic[]
  editor_ready: boolean
  is_pending: boolean
  slug_error: string | null
  reasons: readonly string[]
  /** Редактор между заголовком и подвалом окна. */
  children: ReactNode
  show_saved: boolean
  onClose: () => void
  onDirty: (is_dirty: boolean) => void
  onSubmit: (mode: 'draft' | 'publish', form: ArticleDraftForm) => Promise<ArticleDraft | null>
}

const field_class = 'rounded-lg border border-separator bg-background px-3 py-2 text-sm'

const REASON_KEY = {
  title: 'editor.error.title',
  topic: 'editor.error.topic',
  content: 'editor.error.content',
} as const

function formFrom(initial: ArticleDraft | null, topic_id: string): ArticleDraftForm {
  if (!initial) return { title: '', topic_id, visibility: 'public', comments_enabled: true, slug: '' }
  return {
    title: initial.title,
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
    left.slug === right.slug
  )
}

/** Поля статьи внутри окна: автор и тема сверху, заголовок, подвал с публикацией. */
export function PublishPanel({
  initial,
  topics,
  editor_ready,
  is_pending,
  slug_error,
  reasons,
  children,
  show_saved,
  onClose,
  onDirty,
  onSubmit,
}: PublishPanelProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const active = topics.filter((topic) => topic.status === 'active')
  const [baseline, setBaseline] = useState(() => formFrom(initial, active[0]?.id ?? ''))
  const [form, setForm] = useState(baseline)
  const author_name = viewer.status === 'member' ? viewer.profile.display_name : ''
  const avatar_url = viewer.status === 'member' ? viewer.profile.avatar_url : null

  useEffect(() => {
    onDirty(!sameForm(form, baseline))
  }, [form, baseline, onDirty])

  const update = (patch: Partial<ArticleDraftForm>) => setForm((current) => ({ ...current, ...patch }))
  const can_submit = editor_ready && !is_pending && form.title.trim().length > 0 && form.topic_id.length > 0

  const submit = (mode: 'draft' | 'publish') => {
    void onSubmit(mode, form).then((saved) => {
      if (saved) setBaseline(form)
    })
  }

  return (
    <div className="flex max-h-[min(820px,calc(100dvh-7rem))] flex-col">
      <div className="flex shrink-0 items-center gap-3 px-5 pt-4">
        <Avatar src={avatar_url} name={author_name || t('header.write')} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{author_name}</p>
          <select
            aria-label={t('editor.topic')}
            value={form.topic_id}
            onChange={(event) => update({ topic_id: event.target.value })}
            className="max-w-48 truncate bg-transparent text-sm text-muted outline-none"
          >
            <option value="">{t('editor.no_topic')}</option>
            {active.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </div>
        <Button variant="ghost" isIconOnly aria-label={t('common.close')} className="ml-auto" onPress={onClose}>
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <input
          required
          maxLength={150}
          value={form.title}
          aria-label={t('editor.title')}
          placeholder={t('editor.title')}
          onChange={(event) => update({ title: event.target.value })}
          className="mt-4 w-full bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted"
        />
        <p className="mb-2 text-right text-xs text-muted">{t('editor.title_count', { count: form.title.length })}</p>
        {children}
        {reasons.length > 0 ? (
          <ul className="mt-3 text-sm text-danger">
            {reasons.map((reason) => (
              <li key={reason}>{reason in REASON_KEY ? t(REASON_KEY[reason as keyof typeof REASON_KEY]) : reason}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-separator px-4 py-3">
        <Button variant="primary" isDisabled={!can_submit} onPress={() => submit('publish')}>
          {t('editor.publish')}
        </Button>
        <Button variant="secondary" isDisabled={!can_submit} onPress={() => submit('draft')}>
          {t('editor.save_draft')}
        </Button>
        <Menu>
          <Button variant="ghost" size="sm" aria-label={t('editor.comments_who')}>
            {form.comments_enabled ? t('editor.comments_all') : t('editor.comments_none')}
            <ChevronDownIcon width={16} height={16} />
          </Button>
          <Menu.Content aria-label={t('editor.comments_who')}>
            <Menu.Item onPress={() => update({ comments_enabled: true })}>{`${t('editor.comments_all')} · ${t('editor.comments_default')}`}</Menu.Item>
            <Menu.Item onPress={() => update({ comments_enabled: false })}>{t('editor.comments_none')}</Menu.Item>
          </Menu.Content>
        </Menu>
        <Popover>
          <Button variant="ghost" isIconOnly aria-label={t('editor.settings')}>
            <MoreIcon width={18} height={18} />
          </Button>
          <Popover.Content>
            <div className="flex w-72 flex-col gap-3 p-1">
              <label className="flex flex-col gap-1 text-sm">
                {t('editor.visibility')}
                <select
                  value={form.visibility}
                  onChange={(event) => update({ visibility: event.target.value as ArticleDraftForm['visibility'] })}
                  className={field_class}
                >
                  <option value="public">{t('editor.visibility.public')}</option>
                  <option value="members">{t('editor.visibility.members')}</option>
                  <option value="author">{t('editor.visibility.author')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t('editor.slug')}
                <input
                  value={form.slug}
                  placeholder={initial?.slug || 'moy-adres'}
                  aria-invalid={slug_error ? true : undefined}
                  onChange={(event) => update({ slug: event.target.value })}
                  className={field_class}
                />
                <span className="text-xs text-muted">{t('editor.slug_hint')}</span>
                {slug_error ? <span className="text-sm text-danger">{slug_error}</span> : null}
              </label>
            </div>
          </Popover.Content>
        </Popover>
        {show_saved ? <span className="ml-auto text-sm text-muted">{t('editor.saved')} ✓</span> : null}
      </div>
    </div>
  )
}
