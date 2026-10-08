import { useT } from '@/shared/i18n'
import { Button, Popover } from '@/shared/ui'

/** Круглая кнопка «плюс»: коротко объясняет репутацию и ни на кого не подписывает. */
export function ReputationHint() {
  const { t } = useT()
  return (
    <Popover>
      <Button variant="ghost" isIconOnly aria-label={t('profile.reputation_hint')} className="size-8 rounded-avatar">
        +
      </Button>
      <Popover.Content>
        <p className="max-w-xs text-sm">{t('profile.reputation_hint')}</p>
      </Popover.Content>
    </Popover>
  )
}