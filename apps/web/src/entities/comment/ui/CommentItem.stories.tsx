import preview from '#.storybook/preview'
import { useEffect, useRef } from 'react'
import { StoryProviders } from '@/shared/lib'
import type { CommentNode } from '../model/comment-types.ts'
import { CommentItem } from './CommentItem.tsx'

const comment: CommentNode = {
  id: '7a1c2d30-1111-4a11-8a11-000000000010',
  author: {
    user_id: 'a1000000-0000-4000-8000-000000000001',
    display_name: 'Анна Авторова',
    avatar_url: null,
  },
  body: 'Хороший разбор, спасибо.',
  status: 'visible',
  edited_at: null,
  reaction_counts: { laugh: 1, heart: 0, thumb: 0, fire: 0 },
  reaction_count: 1,
  my_reaction: null,
  created_at: '2026-10-08T10:00:00.000Z',
  time_label: '12:00',
  replies: [],
}

function Frame({ highlighted = false }: { highlighted?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const target = ref.current?.querySelector('article')
    if (target && highlighted) target.dataset.commentHighlighted = 'true'
    return () => { if (target) delete target.dataset.commentHighlighted }
  }, [highlighted])
  return (
    <StoryProviders>
      <div ref={ref} className="max-w-lg p-4">
        <CommentItem comment={comment} />
      </div>
    </StoryProviders>
  )
}

const meta = preview.meta({ title: 'entities/comment/CommentItem', component: Frame })
export const Default = meta.story({})

export const Highlighted = meta.story({ args: { highlighted: true } })
