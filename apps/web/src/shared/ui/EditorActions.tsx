import { useT } from '@/shared/i18n'
import { BaseIcon } from './BaseIcon.tsx'
import { Menu } from './Menu.tsx'
import { Button } from './Button.tsx'
export function EditorActions({
  label,
  onEdit,
  onDelete,
  onUp,
  onDown,
}: {
  label: string
  onEdit: () => void
  onDelete: () => void
  onUp?: (() => void) | undefined
  onDown?: (() => void) | undefined
}) {
  const { t } = useT()
  return (
    <Menu>
      <Button type="button" size="sm" variant="ghost" isIconOnly aria-label={label}>
        <BaseIcon name="more_1" style="line" size={20} />
      </Button>

      <Menu.Content aria-label={label}>
        <Menu.Item id="edit" onAction={onEdit}>
          {t('nav.sections.edit')}
        </Menu.Item>
        <Menu.Item id="up" isDisabled={!onUp} onAction={onUp}>
          {t('widgets.up')}
        </Menu.Item>
        <Menu.Item id="down" isDisabled={!onDown} onAction={onDown}>
          {t('widgets.down')}
        </Menu.Item>
        <Menu.Item id="delete" onAction={onDelete}>
          {t('widgets.remove')}
        </Menu.Item>
      </Menu.Content>
    </Menu>
  )
}
