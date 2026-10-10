import { useT } from '@/shared/i18n'
import { CloseButton } from '@/shared/ui'

type SeenBannerProps = {
  count: number
  onReveal: () => void
  onDismiss: () => void
}

/** Полоса внутри первой карточки ленты, над автором. При нуле вызывающий код её не монтирует, места она не занимает. */
export function SeenBanner({ count, onReveal, onDismiss }: SeenBannerProps) {
  const { t } = useT()
  if (count <= 0) return null
  return (
    <div className="flex items-center gap-3 text-[15px]">
      <button
        type="button"
        aria-label={t('feed.seen.banner', { count })}
        className="group min-w-0 flex-1 truncate rounded-md text-left outline-offset-2"
        onClick={onReveal}
      >
        <span className="text-muted">{t('feed.seen.banner_lead', { count })}</span>{' '}
        <span className="text-accent underline-offset-2 group-hover:underline">{t('feed.seen.banner_count', { count })}</span>
      </button>
      <CloseButton aria-label={t('feed.seen.dismiss')} onPress={onDismiss} />
    </div>
  )
}
