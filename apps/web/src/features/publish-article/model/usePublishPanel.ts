import { useEffect, useState } from 'react'
import type { ArticleDraft, BlocksDocument } from '@blog/contracts'
import type { Topic } from '@/entities/topic'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { TITLE_MAX, formFrom, sameForm } from '../lib/article-form.ts'
import type { ArticleDraftForm } from './usePublishArticle.ts'

type PublishPanelInput = {
  initial: ArticleDraft | null
  topics: Topic[]
  readDocument: () => Promise<BlocksDocument>
  editor_ready: boolean
  is_pending: boolean
  onDirty: (is_dirty: boolean) => void
  onSubmit: (mode: 'draft' | 'publish', form: ArticleDraftForm) => Promise<ArticleDraft | null>
}

/** Поля статьи, предпросмотр и доступность публикации; сохранённая форма становится новой точкой отсчёта. */
export function usePublishPanel({ initial, topics, readDocument, editor_ready, is_pending, onDirty, onSubmit }: PublishPanelInput) {
  const { t } = useT()
  const { viewer } = useViewer()
  const toast = useToast()
  const [preview, setPreview] = useState<BlocksDocument | null>(null)
  const active_topics = topics.filter((topic) => topic.status === 'active')
  const [baseline, setBaseline] = useState(() => formFrom(initial, active_topics[0]?.id ?? ''))
  const [form, setForm] = useState(baseline)

  useEffect(() => {
    onDirty(!sameForm(form, baseline))
  }, [form, baseline, onDirty])

  const update = (patch: Partial<ArticleDraftForm>) => setForm((current) => ({ ...current, ...patch }))
  const can_submit =
    viewer.status === 'member' &&
    viewer.user.can_publish &&
    memberMutationBlock(viewer) === null &&
    editor_ready &&
    !is_pending &&
    form.title.trim().length > 0 &&
    form.title.length <= TITLE_MAX &&
    form.topic_id.length > 0

  const submit = (mode: 'draft' | 'publish') => {
    void onSubmit(mode, form).then((saved) => {
      if (saved) setBaseline(form)
    })
  }

  const togglePreview = async () => {
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

  return {
    form,
    update,
    active_topics,
    can_submit,
    preview,
    author_name: viewer.status === 'member' ? viewer.profile.display_name : '',
    avatar_url: viewer.status === 'member' ? viewer.profile.avatar_url : null,
    handlePublish: () => submit('publish'),
    handleSaveDraft: () => submit('draft'),
    handlePreview: () => void togglePreview(),
  }
}
