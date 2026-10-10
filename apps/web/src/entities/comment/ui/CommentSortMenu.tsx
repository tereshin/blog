import { useT } from '@/shared/i18n'
import { BaseIcon, Button, Menu } from '@/shared/ui'
import { COMMENT_SORTS } from '../model/sort-comments.ts'
import type { CommentSort } from '../model/sort-comments.ts'

type CommentSortMenuProps = { value: CommentSort; onChange: (value: CommentSort) => void }

export function CommentSortMenu({ value, onChange }: CommentSortMenuProps) {
  const { t } = useT()
  return (
    <Menu>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2 text-muted"
        aria-label={t('comment.sort')}
      >
        {t(`comment.sort_${value}`)}
        <BaseIcon name="down" style="line" size={16} />
      </Button>
      <Menu.Content
        aria-label={t('comment.sort')}
        selectionMode="single"
        selectedKeys={[value]}
        onAction={(key) => {
          const next = COMMENT_SORTS.find((sort) => sort === key)
          if (next) onChange(next)
        }}
      >
        {COMMENT_SORTS.map((sort) => (
          <Menu.Item key={sort} id={sort} textValue={t(`comment.sort_${sort}`)}>
            {t(`comment.sort_${sort}`)}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  )
}
