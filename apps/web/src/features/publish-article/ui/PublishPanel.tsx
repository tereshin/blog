import { useEffect, useState } from 'react'
import type { ArticleDraft } from '@blog/contracts'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import type { ArticleDraftForm } from '../model/usePublishArticle.ts'

type PublishPanelProps = {
  initial: ArticleDraft | null
  topics: Topic[]
  editor_ready: boolean
  is_pending: boolean
  slug_error: string | null
  reasons: readonly string[]
  onDirty: (is_dirty: boolean) => void
  onSubmit: (mode: 'draft' | 'publish', form: ArticleDraftForm) => Promise<ArticleDraft | null>
}

const field_class = 'rounded-lg border border-separator bg-background px-3 py-2'

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

export function PublishPanel({ initial, topics, editor_ready, is_pending, slug_error, reasons, onDirty, onSubmit }: PublishPanelProps) {
  const { t } = useT()
  const active = topics.filter((topic) => topic.status === 'active')
  const [baseline, setBaseline] = useState(() => formFrom(initial, active[0]?.id ?? ''))
  const [form, setForm] = useState(baseline)

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
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="flex items-center justify-between gap-2">
          {t('editor.title')}
          <span className="text-muted">{t('editor.title_count', { count: form.title.length })}</span>
        </span>
        <input
          required
          maxLength={150}
          value={form.title}
          onChange={(event) => update({ title: event.target.value })}
          className={field_class}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t('editor.topic')}
        <select value={form.topic_id} onChange={(event) => update({ topic_id: event.target.value })} className={field_class}>
          {active.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
      </label>
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
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.comments_enabled} onChange={(event) => update({ comments_enabled: event.target.checked })} />
        {t('editor.comments')}
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
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" isDisabled={!can_submit} onPress={() => submit('draft')}>
          {t('editor.save_draft')}
        </Button>
        <Button variant="primary" isDisabled={!can_submit} onPress={() => submit('publish')}>
          {t('editor.publish')}
        </Button>
      </div>
      {reasons.length > 0 ? (
        <ul className="text-sm text-danger">
          {reasons.map((reason) => (
            <li key={reason}>{reason in REASON_KEY ? t(REASON_KEY[reason as keyof typeof REASON_KEY]) : reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
