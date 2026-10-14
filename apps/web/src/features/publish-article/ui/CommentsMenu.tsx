import { useT } from '@/shared/i18n'
import { BaseIcon, Button, CommentIcon, Menu } from '@/shared/ui'

type CommentsMenuProps = {
  is_enabled: boolean
  onChange: (is_enabled: boolean) => void
}

/** Кто может комментировать статью: все или никто. */
export function CommentsMenu({ is_enabled, onChange }: CommentsMenuProps) {
  const { t } = useT()
  return (
    <Menu>
      <Button variant="ghost" size="sm" aria-label={t('editor.comments_who')} className="gap-1.5 px-0 text-muted">
        <CommentIcon />
        <span className="hidden sm:inline">{t(is_enabled ? 'editor.comments_all' : 'editor.comments_none')}</span>
        <BaseIcon name="down" style="line" size={16} />
      </Button>
      <Menu.Content
        aria-label={t('editor.comments_who')}
        selectionMode="single"
        selectedKeys={[is_enabled ? 'all' : 'none']}
        onAction={(key) => onChange(key === 'all')}
      >
        <Menu.Item id="all">{t('editor.comments_all')}</Menu.Item>
        <Menu.Item id="none">{t('editor.comments_none')}</Menu.Item>
      </Menu.Content>
    </Menu>
  )
}
