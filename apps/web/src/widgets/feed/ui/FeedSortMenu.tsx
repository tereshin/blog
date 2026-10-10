import { useT } from '@/shared/i18n'
import { Button, ChevronDownIcon, Menu } from '@/shared/ui'

type FeedSortMenuProps = {
  sort: 'fresh' | 'popular'
  onChange: (sort: 'fresh' | 'popular') => void
}

export function FeedSortMenu({ sort, onChange }: FeedSortMenuProps) {
  const { t } = useT()
  return (
    <div className="px-3 sm:px-4">
      <Menu>
        <Button variant="ghost" className="gap-2 px-2 text-muted">
          {t(`profile.sort.${sort}`)}
          <ChevronDownIcon width={16} height={16} />
        </Button>
        <Menu.Content
          aria-label={t('profile.sort.fresh')}
          selectionMode="single"
          selectedKeys={[sort]}
          onAction={(key) => {
            if (key === 'fresh' || key === 'popular') onChange(key)
          }}
        >
          <Menu.Item id="fresh" textValue={t('profile.sort.fresh')}>
            {t('profile.sort.fresh')}
          </Menu.Item>
          <Menu.Item id="popular" textValue={t('profile.sort.popular')}>
            {t('profile.sort.popular')}
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  )
}
