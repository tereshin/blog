import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ArticleDraft, BlocksDocument } from '@blog/contracts'
import { articleKeys, createArticle, publishArticle, updateArticle } from '@/entities/article'
import { profileKeys } from '@/entities/profile'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'

export type ArticleDraftForm = {
  title: string
  topic_id: string
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
  slug: string
}

type UsePublishArticleOptions = {
  article_id: string | undefined
  read_document: () => Promise<BlocksDocument>
  on_saved: (draft: ArticleDraft) => void
}

/** Сохранение черновика и публикация. После удачной записи сбрасываются лента, статья и профиль. */
export function usePublishArticle({ article_id, read_document, on_saved }: UsePublishArticleOptions) {
  const { t } = useT()
  const toast = useToast()
  const query_client = useQueryClient()
  const [slug_error, setSlugError] = useState<string | null>(null)
  const [reasons, setReasons] = useState<readonly string[]>([])

  const refresh = async (draft: ArticleDraft) => {
    query_client.setQueryData(articleKeys.draft(draft.id), draft)
    await query_client.invalidateQueries({ queryKey: articleKeys.lists() })
    await query_client.invalidateQueries({ queryKey: articleKeys.detail(draft.slug) })
    await query_client.invalidateQueries({ queryKey: articleKeys.myDrafts() })
    await query_client.invalidateQueries({ queryKey: profileKeys.all })
  }

  const mutation = useMutation({
    mutationFn: async (input: { mode: 'draft' | 'publish'; form: ArticleDraftForm }) => {
      const blocks = await read_document()
      const slug = input.form.slug.trim()
      const body = {
        title: input.form.title.trim(),
        topic_id: input.form.topic_id,
        blocks,
        visibility: input.form.visibility,
        comments_enabled: input.form.comments_enabled,
        ...(slug ? { slug } : {}),
      }
      const saved = article_id ? await updateArticle(article_id, body) : await createArticle(body)
      await refresh(saved)
      on_saved(saved)
      if (input.mode === 'draft') return saved
      try {
        const published = await publishArticle(saved.id)
        await refresh(published)
        on_saved(published)
        return published
      } catch (error) {
        if (error instanceof ApiError && error.code === 'not_publishable') {
          setReasons(error.reasons)
          return saved
        }
        throw error
      }
    },
  })

  const submit = async (mode: 'draft' | 'publish', form: ArticleDraftForm): Promise<ArticleDraft | null> => {
    setSlugError(null)
    setReasons([])
    try {
      const draft = await mutation.mutateAsync({ mode, form })
      if (mode === 'draft' || draft.status === 'published') toast.success(t('toast.saved'))
      return draft
    } catch (error) {
      if (error instanceof ApiError && error.code === 'slug_taken') {
        setSlugError(t('editor.error.slug_taken'))
        return null
      }
      if (error instanceof ApiError && error.code === 'slug_reserved') {
        setSlugError(t('editor.error.slug_reserved'))
        return null
      }
      if (error instanceof ApiError && error.code === 'not_publishable') {
        setReasons(error.reasons)
        return null
      }
      if (error instanceof Error && error.name === 'InvalidEditorDocumentError') {
        toast.error(t('editor.error.invalid_document'))
        return null
      }
      toast.error(error instanceof ApiError ? error.message : t('toast.failed'))
      return null
    }
  }

  return { submit, is_pending: mutation.isPending, slug_error, reasons }
}
