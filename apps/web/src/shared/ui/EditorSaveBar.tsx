import { useT } from '@/shared/i18n'
import { Button } from './Button.tsx'
export function EditorSaveBar({
  is_dirty,
  is_pending,
  onSave,
  onCancel,
}: {
  is_dirty: boolean
  is_pending: boolean
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = useT()
  return (
    <div className="sticky bottom-[var(--tab-bar-space)] z-10 flex justify-end gap-2 rounded-card border border-separator bg-surface p-3">
      <Button type="button" variant="ghost" isDisabled={!is_dirty || is_pending} onPress={onCancel}>
        {t('common.cancel')}
      </Button>
      <Button type="button" isDisabled={!is_dirty || is_pending} onPress={onSave}>
        {t(is_pending ? 'common.loading' : 'widgets.save')}
      </Button>
    </div>
  )
}
