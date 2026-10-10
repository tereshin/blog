import { useT } from '@/shared/i18n'
import { Button, ShareIcon } from '@/shared/ui'
import { useShareArticle } from '../model/useShareArticle.ts'

type ShareButtonProps = { slug: string }

/** Иконка «Поделиться» в ряду действий карточки и на странице статьи. */
export function ShareButton({ slug }: ShareButtonProps) {
  const { t } = useT()
  const share = useShareArticle(slug)
  return (
    <Button variant="ghost" size="sm" isIconOnly aria-label={t('article.share')} onPress={share}>
      <ShareIcon className="size-5" />
    </Button>
  )
}
