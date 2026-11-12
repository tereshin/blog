import { useEffect } from 'react'
import { useBlocker, useSearchParams } from 'react-router'
import { leftSidebarSchema, sidebarSchema } from '@blog/contracts'
import {
  getLeftSidebar,
  getRightSidebar,
  saveLeftSidebar,
  saveRightSidebar,
  sidebarConfigKeys,
} from '@/entities/admin-widget'
import { useT } from '@/shared/i18n'
import { Button, Dialog, Tabs } from '@/shared/ui'
import { useConfigDraft } from '../model/useConfigDraft.ts'
import { LeftSidebarPanel } from './LeftSidebarPanel.tsx'
import { RightSidebarPanel } from './RightSidebarPanel.tsx'
export function SidebarsEditor() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const side = params.get('side') === 'right' ? 'right' : 'left'
  const left = useConfigDraft({
    query_key: sidebarConfigKeys.left,
    load: getLeftSidebar,
    save: saveLeftSidebar,
    schema: leftSidebarSchema,
    public_key: ['nav-sections'],
  })
  const right = useConfigDraft({
    query_key: sidebarConfigKeys.right,
    load: getRightSidebar,
    save: saveRightSidebar,
    schema: sidebarSchema,
    public_key: ['widgets', 'sidebar'],
  })
  const is_dirty = left.is_dirty || right.is_dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      is_dirty && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!is_dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [is_dirty])
  return (
    <>
      <Tabs selectedKey={side} onSelectionChange={(key) => setParams({ side: String(key) })}>
        <Tabs.List aria-label={t('sidebars.title')}>
          <Tabs.Tab id="left">{t('sidebars.left')}</Tabs.Tab>
          <Tabs.Tab id="right">{t('sidebars.right')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id="left" className="mt-4">
          <LeftSidebarPanel form={left} />
        </Tabs.Panel>
        <Tabs.Panel id="right" className="mt-4">
          <RightSidebarPanel form={right} />
        </Tabs.Panel>
      </Tabs>
      {blocker.state === 'blocked' ? (
        <Dialog
          is_open
          onOpenChange={(open) => {
            if (!open) blocker.reset()
          }}
        >
          <Dialog.Header>
            <Dialog.Heading>{t('sidebars.unsaved')}</Dialog.Heading>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="ghost" onPress={() => blocker.reset()}>
              {t('common.cancel')}
            </Button>
            <Button onPress={() => blocker.proceed()}>{t('sidebars.leave')}</Button>
          </Dialog.Footer>
        </Dialog>
      ) : null}
    </>
  )
}
