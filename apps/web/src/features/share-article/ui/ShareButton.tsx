import { useT } from '@/shared/i18n'
import { ActionButton, ShareIcon } from '@/shared/ui'
import { useShareArticle } from '../model/useShareArticle.ts'

type ShareButtonProps = { slug: string }

/** Иконка «Поделиться» в ряду действий карточки и на странице статьи. */
export function ShareButton({ slug }: ShareButtonProps) {
  const { t } = useT()
  const share = useShareArticle(slug)
  return (
    <ActionButton isIconOnly aria-label={t('article.share')} onPress={share}>
      <span className="action-control__icon"><ShareIcon className="size-5" /></span>
    </ActionButton>
  )
}
