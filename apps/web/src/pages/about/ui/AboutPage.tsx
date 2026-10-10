import { useEffect } from 'react'
import { useSettings } from '@/entities/settings'
import { useT } from '@/shared/i18n'
import { EmptyState, ErrorState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

export default function AboutPage() {
  const { t } = useT()
  const settings = useSettings()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
    setArticleTopicId(null)
  }, [setHeaderCenter, setArticleTopicId])

  if (settings.isPending) return <p className="text-sm text-muted">{t('common.loading')}</p>
  if (settings.isError) return <ErrorState title={t('error.unknown')} onRetry={() => void settings.refetch()} />

  const paragraphs = (settings.data?.about ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)

  if (paragraphs.length === 0) return <EmptyState title={t('about.empty')} />

  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('account.about')}</h1>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="whitespace-pre-wrap text-base leading-7">
          {paragraph}
        </p>
      ))}
    </article>
  )
}
