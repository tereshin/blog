import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { ActionButton, AnimatedCount, Dialog, EyeIcon } from '@/shared/ui'
import type { ArticleCardModel } from '../model/article-types.ts'

type ArticleStatisticsProps = {
  article: Pick<ArticleCardModel, 'view_count' | 'reaction_count' | 'comment_count' | 'bookmark_count'>
}

/** Счётчик открывает статистику, общую для карточки и страницы статьи. */
export function ArticleStatistics({ article }: ArticleStatisticsProps) {
  const { t, locale } = useT()
  const [is_open, setIsOpen] = useState(false)
  const interaction_count = article.view_count + article.reaction_count + article.comment_count + article.bookmark_count
  const number_format = new Intl.NumberFormat(locale)
  const statistics = [
    { label: t('article.views_label'), count: article.view_count },
    { label: t('article.statistics.reactions'), count: article.reaction_count },
    { label: t('article.comments_label'), count: article.comment_count },
    { label: t('article.bookmarks_label'), count: article.bookmark_count },
  ]

  return (
    <>
      <ActionButton
        className="ml-auto"
        aria-label={t('article.statistics.open', {
          views: t('article.views', { count: article.view_count, value: formatCount(article.view_count, locale) }),
        })}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        onPress={() => setIsOpen(true)}
      >
        <span className="action-control__icon"><EyeIcon className="size-5" /></span>
        <AnimatedCount value={article.view_count} locale={locale} className="text-base" />
      </ActionButton>
      <Dialog
        is_open={is_open}
        onOpenChange={setIsOpen}
        size="lg"
        aria-label={t('article.statistics.title')}
        className="gap-6 p-6 sm:max-w-2xl sm:p-8"
      >
        <Dialog.CloseTrigger aria-label={t('common.close')} />
        <Dialog.Header>
          <Dialog.Heading className="pr-8 text-xl font-semibold">
            {t('article.statistics.interactions', { count: interaction_count, value: formatCount(interaction_count, locale) })}
          </Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
            {statistics.map(({ label, count }) => (
              <div key={label} className="flex min-w-0 flex-col gap-1">
                <dt className="text-base text-muted">{label}</dt>
                <dd className="order-first break-words text-2xl font-semibold tabular-nums text-foreground">
                  {number_format.format(count)}
                </dd>
              </div>
            ))}
          </dl>
        </Dialog.Body>
      </Dialog>
    </>
  )
}
