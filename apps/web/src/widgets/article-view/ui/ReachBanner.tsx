import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'

type ReachBannerProps = {
  /** Покупка показов подключается в US14. Пока слот пуст, пилюля только показывает надпись. */
  action?: ReactNode
}

/** Полоса автора: пост может собрать больше охватов. */
export function ReachBanner({ action }: ReachBannerProps) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-secondary px-4 py-3">
      <p className="text-sm">{t('article.reach')}</p>
      {action ?? <span className="rounded-pill bg-accent px-4 py-1.5 text-sm text-accent-foreground">{t('profile.buy_views')}</span>}
    </div>
  )
}
