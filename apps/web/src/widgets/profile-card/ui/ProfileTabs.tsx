import { useT } from '@/shared/i18n'
import { Tabs } from '@/shared/ui'

export function ProfileTabs() {
  const { t } = useT()
  return (
    <Tabs.List aria-label={t('profile.tab.posts')}>
      <Tabs.Tab id="posts">{t('profile.tab.posts')}</Tabs.Tab>
      <Tabs.Tab id="comments">{t('profile.tab.comments')}</Tabs.Tab>
    </Tabs.List>
  )
}
