import type { ArticleDraft } from '@blog/contracts'
import type { ArticleDraftForm } from '../model/usePublishArticle.ts'

export const TITLE_MAX = 150
export const TITLE_COUNTER_FROM = 120

export function formFrom(initial: ArticleDraft | null, topic_id: string): ArticleDraftForm {
  if (!initial)
    return {
      title: '',
      topic_id,
      visibility: 'public',
      comments_enabled: true,
      slug: '',
      seo_title: '',
      seo_description: '',
    }
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

export function sameForm(left: ArticleDraftForm, right: ArticleDraftForm): boolean {
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
