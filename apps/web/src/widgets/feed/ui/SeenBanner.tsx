import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'

type SeenBannerProps = {
  count: number
  onReveal: () => void
  onDismiss: () => void
}

/** Полоса над лентой. При нуле вызывающий код её не монтирует, места она не занимает. */
export function SeenBanner({ count, onReveal, onDismiss }: SeenBannerProps) {
  const { t } = useT()
  if (count <= 0) return null
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <button type="button" className="min-w-0 flex-1 rounded-md text-left outline-offset-2 hover:text-foreground" onClick={onReveal}>
        {t('feed.seen.banner', { count })}
      </button>
      <Button variant="ghost" size="sm" isIconOnly aria-label={t('feed.seen.dismiss')} onPress={onDismiss}>
        <span aria-hidden="true">×</span>
      </Button>
    </div>
  )
}
